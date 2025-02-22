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
 * @return {Promise <void>}             displayBookmarks does not return a value, however it may mutate
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
             * from sky to night. If the user then clears the search bar and inputs another search, the links on the
             * matched bookmarks will still be formatted according to the sky theme. I think this is because we
             * set the formatting of the links according to the sky theme by default in style.css, and because
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
 * @return {Promise <String>}       An HTML-formatted list, formattedText, containing information on the bookmarks
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
 * @return {Promise <Object>}   parentsArray, an array containing the folders bookmarkNode is in. An element
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

// Mainly for testing in the DevTools console
console.log("------------------ EXTENSION CONSOLE ------------------");

// Default theme the extension is in (0 = sky, 1 = night, 2 = beach)
// Currently set to currentTheme = "sky" and themeIndex = 0 by default
let currentTheme = "sky";
let themeIndex = 0;

// Get and display the most recent theme the extension was in (asynchronous process)
loadSavedTheme();

/* Just a safety feature to make sure keepTheme will not affect the extension
 * if we are in the middle of changing the extension theme */
let themeIsChanging = false;

// Array to house the theme backgrounds: [skyColor, nightColor, beachColor, forestColor]
let themeBackgrounds = ["url('backgrounds/sky.png')",
                        "url('backgrounds/night.png')",
                        "url('backgrounds/beach.png')",
                        "url('backgrounds/forest.png')",
                        "url('backgrounds/stationary.png')"];

// Arrays to house the button colors: [skyColor, nightColor, beachColor, forestColor]
let cloudHoveredColors = ["buttons/cloud/cloud-sky-hovered.png",
                          "buttons/cloud/cloud-night-hovered.png",
                          "buttons/cloud/cloud-beach-hovered.png",
                          "buttons/cloud/cloud-forest-hovered.png",
                          "buttons/cloud/cloud-stationary-hovered.png"];

let cloudUnhoveredColors = ["buttons/cloud/cloud-sky.png",
                            "buttons/cloud/cloud-night.png",
                            "buttons/cloud/cloud-beach.png",
                            "buttons/cloud/cloud-forest.png",
                            "buttons/cloud/cloud-stationary.png"];

let moonHoveredColors = ["buttons/moon/moon-sky-hovered.png",
                         "buttons/moon/moon-night-hovered.png",
                         "buttons/moon/moon-beach-hovered.png",
                         "buttons/moon/moon-forest-hovered.png",
                         "buttons/moon/moon-stationary-hovered.png"];

let moonUnhoveredColors = ["buttons/moon/moon-sky.png",
                           "buttons/moon/moon-night.png",
                           "buttons/moon/moon-beach.png",
                           "buttons/moon/moon-forest.png",
                           "buttons/moon/moon-stationary.png"];

let sandcastleHoveredColors = ["buttons/sandcastle/sandcastle-sky-hovered.png",
                               "buttons/sandcastle/sandcastle-night-hovered.png",
                               "buttons/sandcastle/sandcastle-beach-hovered.png",
                               "buttons/sandcastle/sandcastle-forest-hovered.png",
                               "buttons/sandcastle/sandcastle-stationary-hovered.png"];

let sandcastleUnhoveredColors = ["buttons/sandcastle/sandcastle-sky.png",
                                 "buttons/sandcastle/sandcastle-night.png",
                                 "buttons/sandcastle/sandcastle-beach.png",
                                 "buttons/sandcastle/sandcastle-forest.png",
                                 "buttons/sandcastle/sandcastle-stationary.png"];

let treeHoveredColors = ["buttons/tree/tree-sky-hovered.png",
                         "buttons/tree/tree-night-hovered.png",
                         "buttons/tree/tree-beach-hovered.png",
                         "buttons/tree/tree-forest-hovered.png",
                         "buttons/tree/tree-stationary-hovered.png"];

let treeUnhoveredColors = ["buttons/tree/tree-sky.png",
                           "buttons/tree/tree-night.png",
                           "buttons/tree/tree-beach.png",
                           "buttons/tree/tree-forest.png",
                           "buttons/tree/tree-stationary.png"];

let pencilHoveredColors = ["buttons/pencil/pencil-sky-hovered.png",
                           "buttons/pencil/pencil-night-hovered.png",
                           "buttons/pencil/pencil-beach-hovered.png",
                           "buttons/pencil/pencil-forest-hovered.png",
                           "buttons/pencil/pencil-stationary-hovered.png"];

let pencilUnhoveredColors = ["buttons/pencil/pencil-sky.png",
                             "buttons/pencil/pencil-night.png",
                             "buttons/pencil/pencil-beach.png",
                             "buttons/pencil/pencil-forest.png",
                             "buttons/pencil/pencil-stationary.png"];

// Arrays to house the colors used for the search bar: [skyColor, nightColor, beachColor, forestColor, stationaryColor]
let searchBarBackgroundColors = ["#e9f5f2", "#3f5975", "#fffbf2", "#e6f2ec", "#fff5f9"];
let searchBarTextColors = ["#324d47", "#a2bde0", "#a19c8c", "#7d8c84", "#9e7b8b"];
let searchBarPlaceholderColors = ["#8b9492", "#8197b3", "#c4bfb1", "#a1ada7", "#bfaab4"];

// Arrays to house the colors used for the results box: [skyColor, nightColor, beachColor, forestColor, stationaryColor]
let resultsBoxBackgroundColors = ["#badbd4", "#1d2732", "#e8dab5", "#7b8f83", "#e0c8d3"];
let resultsBoxTextColors = ["#324d47", "#d6cab2", "#47443b", "#222b26", "#705d66"];
let resultsBoxLinkColors = ["#3e7a74", "#ffdfa0", "#7a6a45", "#395747", "#8c4967"];

// Arrays to house the colors used for text selection/highlighting: [skyColor, nightColor, beachColor, forestColor, stationaryColor]
let selectionTextColors = ["#f5fffd", "#e3f0ff", "#fffbf0", "#f2fff8", "#fff2f8"];
let selectionBackgroundColors = ["#7a9993", "#35485c", "#9c937e", "#6b7d74", "#9c8691"];

// Arrays to house the colors used for the scrollbar in the results box: [skyColor, nightColor, beachColor, forestColor, stationaryColor]
let scrollbarThumbColors = ["#87a19c", "#48617d", "#a89e83", "#56635b", "#9c8a92"];
let scrollbarTrackColors = ["#abc9c3", "#253240", "#d6c8a7", "#6e8075", "#ccb6c0"];

// Get the relevant elements
const cloud = document.getElementById("cloud");
const moon = document.getElementById("moon");
const sandcastle = document.getElementById("sandcastle");
const tree = document.getElementById("tree");
const pencil = document.getElementById("pencil");
const root = document.querySelector(":root");

// Add Event Listeners for when the theme buttons are hovered over/unhovered
cloud.addEventListener("mouseover", hoverCloud);
cloud.addEventListener("mouseout", unhoverCloud);

moon.addEventListener("mouseover", hoverMoon);
moon.addEventListener("mouseout", unhoverMoon);

sandcastle.addEventListener("mouseover", hoverSandcastle);
sandcastle.addEventListener("mouseout", unhoverSandcastle);

tree.addEventListener("mouseover", hoverTree);
tree.addEventListener("mouseout", unhoverTree);

pencil.addEventListener("mouseover", hoverPencil);
pencil.addEventListener("mouseout", unhoverPencil);

// Add Event Listeners for when the theme buttons are clicked on
cloud.addEventListener("click", skyTheme);
moon.addEventListener("click", nightTheme);
sandcastle.addEventListener("click", beachTheme);
tree.addEventListener("click", forestTheme);
pencil.addEventListener("click", stationaryTheme);

/**
 * Loads a saved theme (stored in chrome's local storage) to the extension. Currently, we use loadSavedTheme
 * to load the most recent theme the extension was in before the user closed the extension. If the extension
 * was just installed, the saved theme will default to the sky theme.
 *
 * loadSavedTheme does not have any parameters.
 *
 * @return {Promise <void>} loadSavedTheme does not return a value, however currentTheme, themeIndex, and
 *                          many of the extension's elements may be mutated. loadSavedTheme is an asynchronous (async)
 *                          function, so it will return a Promise by default, even if it will not return a
 *                          value when the Promise is resolved.
 *
 * Time complexity: O(n);   n = # of saved bookmarks
 *                          loadSavedTheme calls keepTheme, which itself has a time complexity of O(n) currently.
 *
 * Space complexity: O(1);  loadSavedTheme calls keepTheme, which itself has a space complexity of O(1) currently.
 */
async function loadSavedTheme() {
    // Get the saved currentTheme and themeIndex from chrome's local storage
    let savedTheme = await chrome.storage.local.get("currentTheme");
    let savedThemeIndex = await chrome.storage.local.get("themeIndex");

    // Update currentTheme and themeIndex (the variables in this script.js file) if needed
    currentTheme = savedTheme.currentTheme;
    themeIndex = savedThemeIndex.themeIndex;

    // Mainly for testing in the DevTools console
    console.log(`\tcurrentTheme: ${currentTheme}`);
    console.log(`\tthemeIndex: ${themeIndex}\n`);

    // Load the saved theme into the extension
    keepTheme();
}

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
    console.log("Cloud button is hovered over...");
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
    console.log("Cloud button is no longer hovered over...");
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
    console.log("Moon button is hovered over...");
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
    console.log("Moon button is no longer hovered over...");
}

/**
 * Changes the image of the sandcastle button to show that it is being hovered over.
 *
 *                         hoverSandcastle does not have any parameters.
 *
 * @return {void}          hoverSandcastle does not return a value, however sandcastle will be changed.
 *
 * Time complexity: O(1);  hoverSandcastle only calls JavaScript's setAttribute function once.
 *
 * Space complexity: O(1); hoverSandcastle does not call any other functions, so the only addition to the
 *                         call stack would be the initial function call to hoverSandcastle itself.
 */
function hoverSandcastle() {
    // themeIndex will determine the theme color we want our button to have
    sandcastle.setAttribute("src", sandcastleHoveredColors[themeIndex]);
    console.log("Sandcastle button is hovered over...");
}

/**
 * Changes the image of the sandcastle button to show that it is not/no longer being hovered over.
 *
 *                         unhoverSandcastle does not have any parameters.
 *
 * @return {void}          unhoverSandcastle does not return a value, however sandcastle will be changed.
 *
 * Time complexity: O(1);  unhoverSandcastle only calls JavaScript's setAttribute function once.
 *
 * Space complexity: O(1); unhoverSandcastle does not call any other functions, so the only addition to the
 *                         call stack would be the initial function call to unhoverSandcastle itself.
 */
function unhoverSandcastle() {
    // themeIndex will determine the theme color we want our button to have
    sandcastle.setAttribute("src", sandcastleUnhoveredColors[themeIndex]);
    console.log("Sandcastle button is no longer hovered over...");
}

/**
 * Changes the image of the tree button to show that it is being hovered over.
 *
 *                         hoverTree does not have any parameters.
 *
 * @return {void}          hoverTree does not return a value, however tree will be changed.
 *
 * Time complexity: O(1);  hoverTree only calls JavaScript's setAttribute function once.
 *
 * Space complexity: O(1); hoverTree does not call any other functions, so the only addition to the
 *                         call stack would be the initial function call to hoverTree itself.
 */
function hoverTree() {
    // themeIndex will determine the theme color we want our button to have
    tree.setAttribute("src", treeHoveredColors[themeIndex]);
    console.log("Tree button is hovered over...");
}

/**
 * Changes the image of the tree button to show that it is not/no longer being hovered over.
 *
 *                         unhoverTree does not have any parameters.
 *
 * @return {void}          unhoverTree does not return a value, however tree will be changed.
 *
 * Time complexity: O(1);  unhoverTree only calls JavaScript's setAttribute function once.
 *
 * Space complexity: O(1); unhoverTree does not call any other functions, so the only addition to the
 *                         call stack would be the initial function call to unhoverTree itself.
 */
function unhoverTree() {
    // themeIndex will determine the theme color we want our button to have
    tree.setAttribute("src", treeUnhoveredColors[themeIndex]);
    console.log("Tree button is no longer hovered over...");
}

/**
 * Changes the image of the pencil button to show that it is being hovered over.
 *
 *                         hoverPencil does not have any parameters.
 *
 * @return {void}          hoverPencil does not return a value, however pencil will be changed.
 *
 * Time complexity: O(1);  hoverPencil only calls JavaScript's setAttribute function once.
 *
 * Space complexity: O(1); hoverPencil does not call any other functions, so the only addition to the
 *                         call stack would be the initial function call to hoverPencil itself.
 */
function hoverPencil() {
    // themeIndex will determine the theme color we want our button to have
    pencil.setAttribute("src", pencilHoveredColors[themeIndex]);
    console.log("Pencil button is hovered over...");
}

/**
 * Changes the image of the pencil button to show that it is not/no longer being hovered over.
 *
 *                         unhoverPencil does not have any parameters.
 *
 * @return {void}          unhoverPencil does not return a value, however pencil will be changed.
 *
 * Time complexity: O(1);  unhoverPencil only calls JavaScript's setAttribute function once.
 *
 * Space complexity: O(1); unhoverPencil does not call any other functions, so the only addition to the
 *                         call stack would be the initial function call to unhoverPencil itself.
 */
function unhoverPencil() {
    // themeIndex will determine the theme color we want our button to have
    pencil.setAttribute("src", pencilUnhoveredColors[themeIndex]);
    console.log("Pencil button is no longer hovered over...");
}

/**
 * Changes the color palette of the extension to align with the sky theme.
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
async function skyTheme() {
    // Do nothing if the extension is already in sky theme, or if another theme change is taking place at this moment
    if ((currentTheme !== "sky") && (!themeIsChanging)) {
        // Signify that the theme will be changing
        themeIsChanging = true;
        console.log("Changing theme to sky...");

        // Update the theme information to "sky"
        await updateThemeInfo("sky", 0);

        // Switch to sky theme
        changeTheme(themeIndex);

        // Signify that the theme-change is done
        themeIsChanging = false;
        console.log("Theme has been successfully changed to sky\n");
    }
}

/**
 * Changes the color palette of the extension to align with the night theme.
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
async function nightTheme() {
    // Do nothing if the extension is already in night theme, or if another theme change is taking place at this moment
    if ((currentTheme !== "night") && (!themeIsChanging)) {
        // Signify that the theme will be changing
        themeIsChanging = true;
        console.log("Changing theme to night...");

        // Update the theme information to "night"
        await updateThemeInfo("night", 1);

        // Switch to night theme
        changeTheme(themeIndex);

        // Signify that the theme-change is done
        themeIsChanging = false;
        console.log("Theme has been successfully changed to night\n");
    }
}

/**
 * Changes the color palette of the extension to align with the beach theme.
 *
 *                         beachTheme does not have any parameters.
 *
 * @return {void}          beachTheme does not return a value, however many of the elements on the extension
 *                         may be changed by a color switch.
 *
 * Time complexity: O(n);  n = # of saved bookmarks
 *                         beachTheme calls changeTheme, which itself has a time complexity of O(n) currently.
 *
 * Space complexity: O(1); beachTheme calls changeTheme, which itself has a space complexity of O(1) currently.
 */
async function beachTheme() {
    // Do nothing if the extension is already in beach theme, or if another theme change is taking place at this moment
    if ((currentTheme !== "beach") && (!themeIsChanging)) {
        // Signify that the theme will be changing
        themeIsChanging = true;
        console.log("Changing theme to beach...");

        // Update the theme information to "beach"
        await updateThemeInfo("beach", 2);

        // Switch to night theme
        changeTheme(themeIndex);

        // Signify that the theme-change is done
        themeIsChanging = false;
        console.log("Theme has been successfully changed to beach\n");
    }
}

/**
 * Changes the color palette of the extension to align with the forest theme.
 *
 *                         forestTheme does not have any parameters.
 *
 * @return {void}          forestTheme does not return a value, however many of the elements on the extension
 *                         may be changed by a color switch.
 *
 * Time complexity: O(n);  n = # of saved bookmarks
 *                         forestTheme calls changeTheme, which itself has a time complexity of O(n) currently.
 *
 * Space complexity: O(1); forestTheme calls changeTheme, which itself has a space complexity of O(1) currently.
 */
async function forestTheme() {
    // Do nothing if the extension is already in beach theme, or if another theme change is taking place at this moment
    if ((currentTheme !== "forest") && (!themeIsChanging)) {
        // Signify that the theme will be changing
        themeIsChanging = true;
        console.log("Changing theme to forest...");

        // Update the theme information to "forest"
        await updateThemeInfo("forest", 3);

        // Switch to night theme
        changeTheme(themeIndex);

        // Signify that the theme-change is done
        themeIsChanging = false;
        console.log("Theme has been successfully changed to forest\n");
    }
}

/**
 * Changes the color palette of the extension to align with the stationary theme.
 *
 *                         stationaryTheme does not have any parameters.
 *
 * @return {void}          stationaryTheme does not return a value, however many of the elements on the extension
 *                         may be changed by a color switch.
 *
 * Time complexity: O(n);  n = # of saved bookmarks
 *                         stationaryTheme calls changeTheme, which itself has a time complexity of O(n) currently.
 *
 * Space complexity: O(1); stationaryTheme calls changeTheme, which itself has a space complexity of O(1) currently.
 */
async function stationaryTheme() {
    // Do nothing if the extension is already in beach theme, or if another theme change is taking place at this moment
    if ((currentTheme !== "stationary") && (!themeIsChanging)) {
        // Signify that the theme will be changing
        themeIsChanging = true;
        console.log("Changing theme to stationary...");

        // Update the theme information to "stationary"
        await updateThemeInfo("stationary", 4);

        // Switch to night theme
        changeTheme(themeIndex);

        // Signify that the theme-change is done
        themeIsChanging = false;
        console.log("Theme has been successfully changed to stationary\n");
    }
}

/**
 * Changes every element's color in the extension to align with a specified theme.
 *
 * @param {Number} themeIndex An index specifying the theme the extension to be in.
 *                                0: Sky
 *                                1: Night
 *                                2: Beach
 *                                3: Forest
 *                                4: Stationary
 *
 * @return {void}             changeTheme does not return a value, however many of the elements on the extension
 *                            may be changed by a color switch.
 *
 * Time complexity: O(1);     changeTheme changes a set number of variables that the extension's elements derive
 *                            their color from. While, for now, I see these variable changes as occurring regardless
 *                            of the input size, I can understand if the effect of this function is similar to the
 *                            previous implementation of changeTheme, in which each matched bookmark's formatting
 *                            is changed individually (causing the time complexity for changeTheme to be O(n)).
 *
 * Space complexity: O(1);    changeTheme calls changeThemeButton, which itself has a space complexity of O(1).
 */
function changeTheme(themeIndex) {
    // Change the background theme
    document.documentElement.style.backgroundImage = themeBackgrounds[themeIndex];
    document.body.style.backgroundImage = themeBackgrounds[themeIndex];

    // Change the search bar colors
    root.style.setProperty("--search-bar-background-color", searchBarBackgroundColors[themeIndex]);
    root.style.setProperty("--input-text-color", searchBarTextColors[themeIndex]);
    root.style.setProperty("--placeholder-text-color", searchBarPlaceholderColors[themeIndex]);

    // Change the results box colors
    root.style.setProperty("--results-box-background-color", resultsBoxBackgroundColors[themeIndex]);
    root.style.setProperty("--paragraph-color", resultsBoxTextColors[themeIndex]);
    root.style.setProperty("--link-color", resultsBoxLinkColors[themeIndex]);

    // Change the text selection colors
    root.style.setProperty("--selection-text-color", selectionTextColors[themeIndex]);
    root.style.setProperty("--selection-background-color", selectionBackgroundColors[themeIndex]);

    // Change the scrollbar colors
    root.style.setProperty("--scrollbar-thumb-color", scrollbarThumbColors[themeIndex]);
    root.style.setProperty("--scrollbar-track-color", scrollbarTrackColors[themeIndex]);

    // Change the theme button colors
    changeThemeButton(cloud, cloudHoveredColors, cloudUnhoveredColors);
    changeThemeButton(moon, moonHoveredColors, moonUnhoveredColors);
    changeThemeButton(sandcastle, sandcastleHoveredColors, sandcastleUnhoveredColors);
    changeThemeButton(tree, treeHoveredColors, treeUnhoveredColors);
    changeThemeButton(pencil, pencilHoveredColors, pencilUnhoveredColors);
}

/**
 * Changes a theme button's color to align with a specified theme.
 *
 * @param {Object} button          The theme button to change.
 *
 * @param {Object} hoveredColors   An array of colors that are used to indicate that button is being hovered over.
 *
 * @param {Object} unhoveredColors An array of colors that are used to indicate that button is not being hovered over.
 *
 * @return {void}                  changeThemeButton does not return a value, however the color of button may be
 *                                 changed.
 *
 * Time complexity: O(1);          changeThemeButton seems to execute a set number of instructions, regardless of the
 *                                 input size. hoveredColors and unhoveredColors are arrays, so I will assume that
 *                                 randomly accessing their elements will take a time complexity of O(1).
 *
 * Space complexity: O(1);         The only addition to the call stack would be the initial function call to
 *                                 changeThemeButton itself.
 */
function changeThemeButton(button, hoveredColors, unhoveredColors) {
    // Keep the button "hovered over" if the user's cursor is still on the button
    if (button.matches(":hover"))
        button.setAttribute("src", hoveredColors[themeIndex]);

    // Otherwise, set the button to its "unhovered" color
    else
        button.setAttribute("src", unhoveredColors[themeIndex]);
}

/**
 * Updates currentTheme and themeIndex to a new theme and index, and stores this new information in chrome's
 * local storage (we currently override the previous theme and index stored in chrome's local storage).
 *
 * @param {String} newTheme      The new theme the extension is in: "sky", "night", "beach", "forest", "stationary"
 *
 * @param {Number} newThemeIndex The new theme index that specifies the extension's theme.
 *                               0: Sky
 *                               1: Night
 *                               2: Beach
 *                               3: Forest
 *                               4: Stationary
 *
 * @return {Promise <void>}      updateThemeInfo does not return a value, however currentTheme, themeIndex, and
 *                               chrome's local storage may be mutated. updateThemeInfo is an asynchronous (async)
 *                               function, so it will return a Promise by default, even if it will not return a
 *                               value when the Promise is resolved.
 *
 * Time complexity: O(1);        updateThemeInfo's "path" is fixed for the time being.
 *
 * Space complexity: O(1);       The only addition call to the call stack will be the initial call to
 *                               updateThemeInfo itself.
 */
async function updateThemeInfo(newTheme, newThemeIndex) {
    // Update the theme information in this script.js file
    currentTheme = newTheme;
    themeIndex = newThemeIndex;

    /* Update the theme information in chrome's local storage; we want chrome's local
     * storage to keep the most recent theme the extension was in */
    await chrome.storage.local.set({currentTheme: newTheme});
    await chrome.storage.local.set({themeIndex: newThemeIndex});

    // Mainly for testing in the DevTools console
    console.log("chrome's local storage has been updated to:")
    console.log(`\tcurrentTheme: ${currentTheme}`);
    console.log(`\tthemeIndex: ${themeIndex}\n`);
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
