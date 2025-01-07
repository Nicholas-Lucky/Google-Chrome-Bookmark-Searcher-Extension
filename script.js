/* ----------------------------- VVV Bookmark Search Implementation VVV ----------------------------- */

// Counter used for checking the latest search entered by the user (mainly used in displayBookmarks for now)
let currentSearchID = 0;

// Get the relevant elements
const searchText = document.getElementById("search-text");
const resultsText = document.getElementById("results-text");

// 1. Event listener for the search bar (waits for ANY input in the search bar)
// Wait for user input (in which case, search for bookmarks)
searchText.addEventListener("input", displayBookmarks);

/**
 * Uses the user's input into the extension search bar, searchText, searches for bookmarks that
 * contain searchText in their titles, and displays the bookmarks to resultsText.
 *
 *                                      displayBookmarks does not require any parameters.
 *
 * @return {Promise}                    displayBookmarks does not return a value, however it may mutate
 *                                      resultsText if any bookmarks are found to have searchText in their titles.
 *                                      While displayBookmarks is not meant to return a value, however, it is an
 *                                      asynchronous (async) function, so it will return a Promise by default.
 *
 * Time complexity: O(n + n * c_total); n = # of bookmarks; c_total = total # of characters across all bookmark titles
 *                                                                    in bookmarksArray
 *                                      displayBookmarks calls the searchForBookmarks function, which has a time
 *                                      complexity of O(n), and then calls the formatBookmarksToHTML function, which
 *                                      has a time complexity of O(n * c_total). Note: At this moment, I am unsure
 *                                      of the time complexity of chrome.bookmarks.getTree(), which may or may not
 *                                      affect the overall time complexity of displayBookmarks.
 *            or...
 *
 * Time complexity: O(n + n^2 * c_ave); n = # of bookmarks; c_ave = average # of characters in a bookmark title
 *                                      Similar to O(n + n * c_total), in this case I am assuming that
 *                                      c_total = n * c_ave.
 *
 * Space complexity: O(n);              n = # of saved bookmarks
 *                                      displayBookmarks calls the searchForBookmarks function, which has a space
 *                                      complexity of O(n), and then calls the formatBookmarksToHTML function, which
 *                                      also has a space complexity of O(n). Note: At this moment, I am unsure
 *                                      of the space complexity of chrome.bookmarks.getTree(), which may or may not
 *                                      affect the overall space complexity of displayBookmarks.
 */
async function displayBookmarks() {
    /* Increment currentSearchID, and set functionCallID to currentSearchID; we will use these two variables
     * to confirm whether this current call to displayBookmarks is the latest call that has been made at
     * a given moment, as we want to display the results of the latest search to the extension window.
     *
     * This is needed because searching and displaying the results of different searches may take different
     * amounts of time. In addition, many of the functions for this extension are asynchronous (async) functions,
     * meaning that these functions can run in the background of the extension. As a result, there may be a
     * situation in which a search is made, and then a second search is made immediately after the first search.
     * If the first search takes longer to search and display its results than the second search, then, it may
     * be possible for the results of the second search to be displayed first, and for the results of the first
     * search to then override the second search's results with its later display. For now, we want our extension
     * to display the results of the latest search, so we would want to avoid this situation. */
    currentSearchID++;
    let functionCallID = currentSearchID;

    // Return to the default "placeholder" text if the user removes their input from the search bar
    if (searchText.value == "")
        resultsText.innerHTML = "Results go here...";

    // At this point, assume the user has inputted something into the search bar
    else {
        /* Get the entire bookmarks tree, and the root node
         *
         * Note: It seems that getTree() returns a Promise, meaning the return value may not be immediately
         *       given. I previously used a function() method, where we specify a function to use the return
         *       value of getTree() after the Promise has been fulfilled, however I have changed the code
         *       to now have a variable store the return value of getTree(), and use the await keyword to
         *       allow us to retrieve the return value of getTree() before moving on. */
        let bookmarkTree = await chrome.bookmarks.getTree();

        // 2. Google Chrome's bookmarks are stored in a tree; traverse through all bookmarks
        // Find the bookmarks whose titles contain searchText, and store them in an array!
        let bookmarksArray = searchForBookmarks(bookmarkTree[0]);

        // Format bookmarksArray into an HTML list we can display
        let formattedHTMLText = await formatBookmarksToHTML(bookmarksArray);

        /* Make sure we are still on the latest call of displayBookmarks (if later calls of displayBookmarks occurred
         * while this current displayBookmarks call was running, currentSearchID would have been incremented, making
         * it no longer equal to functionCallID) */
        if (functionCallID == currentSearchID)
            // Display the found bookmarks to resultsText
            resultsText.innerHTML = formattedHTMLText;

            /* The implementation for this function and its relating functionality will appear later in the code,
             * however we essentially encountered a minor issue where, suppose the user switches the extension theme
             * from Sky to Night. If the user then clears the search bar and inputs another search, the links on the
             * matched bookmarks will still be formatted according to the SKy theme. I think this is because we
             * set the formatting of the links according to the Sky theme by default in style.css, and because
             * changeTheme (another function whose implementation appears later in the code) only changes the
             * formatting of the elements that currently exist in the extension window; to my knowledge, the <a>
             * links are the only elements who are not always present in the extension window: when the search bar is
             * empty. Hence, keepTheme will prevent this by making sure these <a> links are formatted according to the
             * current theme directly after they have been displayed on the extension window. */
            keepTheme();
    }
}

/**
 * Uses the user's input into the extension search bar, searchText, and searches for bookmarks that contain
 * searchText in their titles. Traverses through each bookmark and folder via recursion, in a preorder
 * traversal style (I think, since we start with a parent node first, and then traverse to the node's
 * children before moving onto sibling nodes).
 *
 * @param {Object} bookmarkNode A bookmark/folder in Google Chrome's bookmark tree (Google Chrome stores
 *                              bookmarks in a tree). chrome for developers defines this to be of type
 *                              BookmarkTreeNode.
 *
 * @return {Object}             foundBookmarks, an array containing the bookmarks that are found to have
 *                              searchText in their titles. The bookmarks in the array are defined by
 *                              chrome for developers to be of type BookmarkTreeNode.
 *
 * Time complexity: O(n);       n = # of saved bookmarks
 *                              We need to traverse through all nodes in the bookmark tree.
 *
 * Space complexity: O(n);      n = # of saved bookmarks
 *                              In the worst case, the bookmarks are the sole children/parents of one another
 *                              (organized similar to a linked list kind of)
 */
function searchForBookmarks(bookmarkNode) {
    /* Make an array to store the bookmarks that have been matched with the search bar input
     *
     * Note: If bookmarkNode is not a bookmark, and does not have any children, then foundBookmarks
     * will remain and be returned as an empty array ([]), which will be our base case. */
    let foundBookmarks = [];

    /* bookmarkNode only has a url if it is a bookmark and not a folder, so, from what I have seen,
     * this if-condition will pass if bookmarkNode is a folder */
    if (bookmarkNode.url) {
        /* Get the relevant information
         * Convert the information to lowercase, since the bookmark search (for now) will not be case-sensitive */
        let title = bookmarkNode.title.toLowerCase();
        let searched = searchText.value.toLowerCase();

        // 3. While traversing through a bookmark, check if a part of its title is included in the search bar
        // Add the bookmark to foundBookmarks if it contains searched (searchText) in its title
        if (title.indexOf(searched) != -1)
            foundBookmarks.push(bookmarkNode);
    }

    // Recursively traverse to bookmarkNode's children nodes, if bookmarkNode has any
    if (bookmarkNode.children) {
        for (let i = 0; i < bookmarkNode.children.length; i++) {
            // Get any children bookmarks whose titles are matched with the search bar input
            let childrenBookmarks = searchForBookmarks(bookmarkNode.children[i]);

            // Add the matched children bookmarks to foundBookmarks
            for (let j = 0; j < childrenBookmarks.length; j++)
                foundBookmarks.push(childrenBookmarks[j]);
        }
    }

    // Return the found bookmarks!
    return foundBookmarks;
}

/**
 * Converts an array of bookmarks to an HTML list containing the bookmarks' titles, their links (linked to the
 * titles), and the folder(s) they are in (if it/they exist(s)).
 *
 * @param {Object} bookmarksArray   An array containing the bookmarks that contain the user's input, searchText,
 *                                  in their titles.
 *
 * @return {Promise}                An HTML-formatted list, formattedText, containing information on the bookmarks
 *                                  in bookmarksArray. formatBookmarksToHTML is an asynchronous (async) function,
 *                                  so it can be run in the background, causing its return value to temporarily be
 *                                  a Promise; upon resolution, the return value should be a string {String}.
 *
 * Time complexity: O(n * c_total); n = # of bookmarks; c_total = total # of characters across all bookmark titles
 *                                                                in bookmarksArray
 *
 *                                  We need to traverse through each character in each title of each bookmark, with
 *                                  each title calling getParentFolders, which itself has a time complexity of O(n).
 *            or...
 *
 * Time complexity: O(n^2 * c_ave); n = # of bookmarks; c_ave = average # of characters in a bookmark title
 *                                  Similar to O(n * c_total), in this case I am assuming that c_total = n * c_ave.
 *
 * Space complexity: O(n);          n = # of saved bookmarks
 *                                  formatBookmarksToHTML does call getParentFolders, which has a space complexity
 *                                  of O(n). Otherwise, however, I don't think formatBookmarksToHTML adds more to
 *                                  the call stack other than it's initial function call.
 */
async function formatBookmarksToHTML(bookmarksArray) {
    // HTML-formatted list to be returned
    let formattedText = "";

    // 4. If a bookmark title is in the search bar, add it to the results text
    // Format every bookmark in bookmarksArray to formattedText
    for (let i = 0; i < bookmarksArray.length; i++) {
        // Add newlines to separate bookmark entries
        if (i != 0)
            formattedText += "<br><br>";

        // Get the relevant information
        let title = bookmarksArray[i].title;
        let url = bookmarksArray[i].url;

        // Make the link (<a>) tags
        let linkOpeningTag = `<a href="${url}">`;
        let linkClosingTag = "</a>";

        // Make the formatted title (part of the title containing searchText will be bolded)
        let formattedTitle = "";

        // Find searchText in title (the indices in which searchText begins and ends)
        let boldStartingIndex = title.toLowerCase().indexOf(searchText.value.toLowerCase());
        let boldEndingIndex = boldStartingIndex + searchText.value.length - 1;

        // Go through each character in title
        for (let j = 0; j < title.length; j++) {
            // Add the opening bold tag for the "searchText portion" of the title
            if (j == boldStartingIndex)
                formattedTitle += "<b>";

            // Add a title character to formattedTitle
            formattedTitle += title[j];

            // Add the closing bold tag for the "searchText portion" of the title
            if (j == boldEndingIndex)
                formattedTitle += "</b>";
        }

        // Find the folder(s) bookmarksArray[i] is in, if it/they exist(s)
        let parentFolders = await getParentFolders(bookmarksArray[i]);

        // Format the parent folders into HTML
        let formattedParentFolders = "";
        for (let j = 0; j < parentFolders.length - 1; j++) {
            // Add an extra indent for each proceeding parent
            let indents = "&emsp;".repeat(j + 1);

            // Format the parent folder into formattedParentFolders
            formattedParentFolders += `<br>${indents}In: ${parentFolders[j]}`;
        }

        // Make the HTML-formatted bookmark entry, and add it to formattedText
        let bookmarkEntry = linkOpeningTag + formattedTitle + linkClosingTag + formattedParentFolders;
        formattedText += bookmarkEntry;
    }

    // At this point, our HTML-formatted bookmarks are ready!
    return formattedText;
}

/**
 * Recursively retrieves the folder(s) an inputted bookmark is housed in.
 *
 * @param {Object} bookmarkNode A bookmark/folder in Google Chrome's bookmark tree (Google Chrome stores
 *                              bookmarks in a tree). chrome for developers defines this to be of type
 *                              BookmarkTreeNode.
 *
 * @return {Promise}            parentsArray, an array containing the folders bookmarkNode is in. An element
 *                              in parentsArray is the parent folder of an element to its left, and is a
 *                              child folder of an element to its right. getParentFolders is an asynchronous
 *                              (async) function, so it can be run in the background, causing its return value
 *                              to temporarily be a Promise; upon resolution, the return value should be an
 *                              array {Object}.
 *
 * Time complexity: O(n);       n = # of saved bookmarks
 *                              In the worst case, the bookmarks are the sole children/parents of one another
 *                              (organized similar to a linked list kind of)
 *
 * Space complexity: O(n);      n = # of saved bookmarks
 *                              In the worst case, the bookmarks are the sole children/parents of one another
 *                              (organized similar to a linked list kind of)
 */
async function getParentFolders(bookmarkNode) {
    // Check if bookmarkNode has a parent folder
    if (bookmarkNode.parentId) {
        // If so, add the parent folder of bookmarkNode to parentsArray
        let parentFolder = await chrome.bookmarks.get(bookmarkNode.parentId);

        // Make an array to house the folders bookmarkNode is in
        let parentsArray = [parentFolder[0].title];

        // Recursively retrieve an array containing the folders parentFolder is in
        let parentsOfParents = await getParentFolders(parentFolder[0]);

        // Add the parent folders of parentsOfParents to parentsArray
        for (let i = 0; i < parentsOfParents.length; i++)
            parentsArray.push(parentsOfParents[i]);

        // At this point, we should have all the folders bookmarkNode is in!
        return parentsArray;
    }

    // Otherwise, return an empty array (base case)
    return [];
}



/* ----------------------------- VVV Theme Toggle Implementation VVV ----------------------------- */

// Current theme the extension is in (0 = sky, 1 = night)
let currentTheme = "sky";
let themeIndex = 0;

/* Just a safety feature to make sure keepTheme will not affect the extension
 * if we are in the middle of changing the extension theme */
let themeIsChanging = false;

// Array to house the theme backgrounds: [skyColor, nightColor]
let themeBackgrounds = ["url('backgrounds/sky.png')", "url('backgrounds/night.png')"];

// Arrays to house the button colors: [skyColor, nightColor]
let cloudHoveredColors = ["buttons/cloud-sky-hovered.png", "buttons/cloud-night-hovered.png"];
let cloudUnhoveredColors = ["buttons/cloud-sky.png", "buttons/cloud-night.png"];
let moonHoveredColors = ["buttons/moon-sky-hovered.png", "buttons/moon-night-hovered.png"];
let moonUnhoveredColors = ["buttons/moon-sky.png", "buttons/moon-night.png"];

// Array to house the colors used for the search bar: [skyColor, nightColor]
let searchBarBackgroundColors = ["#e9f5f2", "#3f5975"];
let searchBarPlaceholderColors = ["#8b9492", "#6b8199"];
let searchBarTextColors = ["#324d47", "#a9b7c7"];

// Arrays to house the colors used for the results box: [skyColor, nightColor]
let resultsBoxBackgroundColors = ["#badbd4", "#1d2732"];
let resultsBoxTextColors = ["#324d47", "#d8c8a8"];
let resultsBoxLinkColors = ["#3e7a6e", "#ffdfa0"];

// Get the relevant elements
const cloud = document.getElementById("cloud");
const moon = document.getElementById("moon");

const searchBar = document.querySelector("input[type=text]");
const searchBarPlaceholder = document.getElementsByTagName("input::placeholder");

const resultsBox = document.getElementById("results-box");
const resultsBoxText = document.getElementsByTagName("p");
const resultsBoxLink = document.getElementsByTagName("a");

// Add Event Listeners for when the theme buttons are hovered over/unhovered
cloud.addEventListener("mouseover", hoverCloud);
cloud.addEventListener("mouseout", unhoverCloud);
moon.addEventListener("mouseover", hoverMoon);
moon.addEventListener("mouseout", unhoverMoon);

// Add Event Listeners for when the theme buttons are clicked on
cloud.addEventListener("click", skyTheme);
moon.addEventListener("click", nightTheme);

/**
 * Changes the image of the cloud button to show that it is being hovered over.
 *
 *                         hoverCloud does not have any parameters.
 *
 * @return {void}          hoverCloud does not return a value, however cloud will be changed.
 *
 * Time complexity: O(1);  hoverCloud only calls JavaScript's setAttribute function once.
 *
 * Space complexity: O(1); hoverCloud does not call any other functions, so the only addition to the
 *                         call stack would be the initial function call to hoverCloud itself.
 */
function hoverCloud() {
    // themeIndex will determine the theme color we want our button to have
    cloud.setAttribute("src", cloudHoveredColors[themeIndex]);
}

/**
 * Changes the image of the cloud button to show that it is not/no longer being hovered over.
 *
 *                         unhoverCloud does not have any parameters.
 *
 * @return {void}          unhoverCloud does not return a value, however cloud will be changed.
 *
 * Time complexity: O(1);  unhoverCloud only calls JavaScript's setAttribute function once.
 *
 * Space complexity: O(1); unhoverCloud does not call any other functions, so the only addition to the
 *                         call stack would be the initial function call to unhoverCloud itself.
 */
function unhoverCloud() {
    // themeIndex will determine the theme color we want our button to have
    cloud.setAttribute("src", cloudUnhoveredColors[themeIndex]);
}

/**
 * Changes the image of the moon button to show that it is being hovered over.
 *
 *                         hoverMoon does not have any parameters.
 *
 * @return {void}          hoverMoon does not return a value, however moon will be changed.
 *
 * Time complexity: O(1);  hoverMoon only calls JavaScript's setAttribute function once.
 *
 * Space complexity: O(1); hoverMoon does not call any other functions, so the only addition to the
 *                         call stack would be the initial function call to hoverMoon itself.
 */
function hoverMoon() {
    // themeIndex will determine the theme color we want our button to have
    moon.setAttribute("src", moonHoveredColors[themeIndex]);
}

/**
 * Changes the image of the moon button to show that it is not/no longer being hovered over.
 *
 *                         unhoverMoon does not have any parameters.
 *
 * @return {void}          unhoverMoon does not return a value, however moon will be changed.
 *
 * Time complexity: O(1);  unhoverMoon only calls JavaScript's setAttribute function once.
 *
 * Space complexity: O(1); unhoverMoon does not call any other functions, so the only addition to the
 *                         call stack would be the initial function call to unhoverMoon itself.
 */
function unhoverMoon() {
    // themeIndex will determine the theme color we want our button to have
    moon.setAttribute("src", moonUnhoveredColors[themeIndex]);
}

/**
 * Changes the color palette of the extension to align with the Sky theme.
 *
 *                         skyTheme does not have any parameters.
 *
 * @return {void}          skyTheme does not return a value, however many of the elements on the extension
 *                         may be changed by a color switch.
 *
 * Time complexity: O(n);  n = # of saved bookmarks
 *                         skyTheme calls changeTheme, which itself has a time complexity of O(n) currently.
 *
 * Space complexity: O(1); skyTheme calls changeTheme, which itself has a space complexity of O(1) currently.
 */
function skyTheme() {
    // Do nothing if the extension is already in sky theme
    if (currentTheme != "sky") {
        // Signify that the theme will be changing
        themeIsChanging = true;

        // Change the theme information to "sky"
        currentTheme = "sky";
        themeIndex = 0;

        // Switch to sky theme
        changeTheme(themeIndex);

        // Signify that the theme-change is done
        themeIsChanging = false;
    }
}

/**
 * Changes the color palette of the extension to align with the Night theme.
 *
 *                         nightTheme does not have any parameters.
 *
 * @return {void}          nightTheme does not return a value, however many of the elements on the extension
 *                         may be changed by a color switch.
 *
 * Time complexity: O(n);  n = # of saved bookmarks
 *                         nightTheme calls changeTheme, which itself has a time complexity of O(n) currently.
 *
 * Space complexity: O(1); nightTheme calls changeTheme, which itself has a space complexity of O(1) currently.
 */
function nightTheme() {
    // Do nothing if the extension is already in sky theme
    if (currentTheme != "night") {
        // Signify that the theme will be changing
        themeIsChanging = true;

        // Change the theme information to "night"
        currentTheme = "night";
        themeIndex = 1;

        // Switch to night theme
        changeTheme(themeIndex);

        // Signify that the theme-change is done
        themeIsChanging = false;
    }
}

/**
 * Changes every element's color in the extension to align with a specified theme.
 *
 * @param {Number} themeIndex An index specifying the theme the extension to be in.
 *                                0: Sky
 *                                1: Night
 *
 * @return {void}             changeTheme does not return a value, however many of the elements on the extension
 *                            may be changed by a color switch.
 *
 * Time complexity: O(n);     n = # of saved bookmarks
 *                            If the user searches for a set of bookmarks, and changes the theme while the matched
 *                            bookmarks are still displaying on the results box, then changeTheme will loop through
 *                            the links of each matched bookmark in the results box to change the links' colors to
 *                            match the appropriate theme; in the worst case scenario, all of the user's saved
 *                            bookmarks will be displayed in the results box when changeTheme is called.
 *
 * Space complexity: O(1);    changeTheme does not call any other functions, so the only addition to the call stack
 *                            would be the initial function call to changeTheme itself.
 */
function changeTheme(themeIndex) {
    // Change the background theme
    document.documentElement.style.backgroundImage = themeBackgrounds[themeIndex];
    document.body.style.backgroundImage = themeBackgrounds[themeIndex];

    // Change the search bar colors
    searchBar.style.backgroundColor = searchBarBackgroundColors[themeIndex];
    searchBar.style.color = searchBarTextColors[themeIndex];

    for (let i = 0; i < searchBarPlaceholder.length; i++)
        searchBarPlaceholder[i].style.color = searchBarPlaceholderColors[themeIndex];

    // Change the results box colors
    resultsBox.style.backgroundColor = resultsBoxBackgroundColors[themeIndex];

    for (let i = 0; i < resultsBoxText.length; i++)
        resultsBoxText[i].style.color = resultsBoxTextColors[themeIndex];

    for (let i = 0; i < resultsBoxLink.length; i++)
        resultsBoxLink[i].style.color = resultsBoxLinkColors[themeIndex];

    // Change the theme menu colors. Keep a button "hovered over" if the user's cursor is still on the button
    if (cloud.matches(":hover"))
        cloud.setAttribute("src", cloudHoveredColors[themeIndex]);
    else
        cloud.setAttribute("src", cloudUnhoveredColors[themeIndex]);

    if (moon.matches(":hover"))
        moon.setAttribute("src", moonHoveredColors[themeIndex]);
    else
        moon.setAttribute("src", moonUnhoveredColors[themeIndex]);
}

/**
 * Makes sure every element's color in the extension aligns with the theme the extension is currently in.
 *
 *                         keepTheme does not have any parameters.
 *
 * @return {void}          keepTheme does not return a value, however many of the elements on the extension
 *                         may be changed by a color switch.
 *
 * Time complexity: O(n);  n = # of saved bookmarks
 *                         keepTheme calls changeTheme, which itself has a time complexity of O(n) currently.
 *
 * Space complexity: O(1); keepTheme calls changeTheme, which itself has a space complexity of O(1) currently.
 */
function keepTheme() {
    // Only perform this "theme check" if the extension is currently not in the middle of changing themes
    if (!themeIsChanging)
        changeTheme(themeIndex);
}
