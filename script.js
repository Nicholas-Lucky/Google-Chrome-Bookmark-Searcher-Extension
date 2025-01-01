        //resultsText.innerHTML = searchText.value + "<br>" + "&emsp;" + "HEY";

        //let bookmarkTitles = [];
        //let bookmarkURLS = [];
        /*
        chrome.bookmarks.search(searchText.value, function (data) {
            let finalText = "";
            for (let i = 0; i < data.length; i++) {

                if (data[i].title.indexOf(searchText.value) == -1)
                    continue;

                if (i != 0)
                    finalText += "<br><br>"

                finalText += data[i].title;

                finalText += "<br>";
                finalText += "&emsp;";

                finalText += data[i].url;

                //bookmarkTitles.push(data[i].title);
                //bookmarkURLS.push(data[i].url);
            }

            resultsText.innerHTML = finalText;
        });*/

// 1. Event listener for the search bar (not sure if this would happen if the user enters or if there is ANY input yk)

// 2. Google's bookmarks are stored in a tree, gotta traverse through all bookmarks

// 3. While traversing through bookmarks, check if the... name?? is included in the search bar (idk about keywords yet)

// 4. If the name is in the search bar, add it to the results text somehow idk

// 5. Somehow allow this process to occur continuously in case the user searches diff things (rn assuming that this happens automatically)

// Do we store the bookmarks in a list??







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
 *                displayBookmarks does not require any parameters.
 *
 * @return {void} displayBookmarks does not return a value, however it may mutate
 *                resultsText if any bookmarks are found to have searchText in their titles.
 */
function displayBookmarks() {
    // Return to the default "placeholder" text if the user removes their input from the search bar
    if (searchText.value == "")
        resultsText.innerHTML = "Results go here...";

    // At this point, assume the user has inputted something into the search bar
    else {
        /* Get the entire bookmarks tree, and the root node
         *
         * Note: It seems that getTree() returns a Promise, meaning the return value
         *       may not be immediately given. I've seen that there are multiple ways
         *       to work with this, like with the .then keyword, however for now I
         *       will stick with this function() method, where we specify a function
         *       to use the return value of getTree() after the Promise has been
         *       fulfilled */
        chrome.bookmarks.getTree(function(fullTree) {
            // 2. Google Chrome's bookmarks are stored in a tree; traverse through all bookmarks
            // Store the bookmarks in an array!
            let bookmarksArray = [];
            searchForBookmarks(fullTree[0], bookmarksArray);

            // Display the found bookmarks to resultsText
            resultsText.innerHTML = formatBookmarksToHTML(bookmarksArray);
        });
    }
}

/**
 * Uses the user's input into the extension search bar, searchText, searches for bookmarks that contain
 * searchText in their titles, and displays the bookmarks to resultsText. Traverses through each bookmark
 * and folder via recursion, in a preorder traversal style (I think, since we start with a parent node
 * first, and then traverse to the node's children before moving onto sibling nodes).
 *
 * @param {Object} bookmarkNode A bookmark/folder in Google Chrome's bookmark tree (Google Chrome stores
 *                              bookmarks in a tree). chrome for developers defines this to be of type
 *                              BookmarkTreeNode.
 *
 * @param {Object} currentArray An array containing the bookmarks that contain the user's input, searchText,
 *                              in their titles. Will be added to throughout the course of the function.
 *
 * @return {void}               searchForBookmarks does not return a value, however it may mutate currentArray
 *                              if any bookmarks are found to have searchText in their titles.
 *
 * Time complexity: O(n);       n = # of saved bookmarks
 *                              We need to traverse through all nodes in the bookmark tree.
 *
 * Space complexity: O(n);      n = # of saved bookmarks
 *                              In the worst case, the bookmarks are the sole children/parents of one another
 *                              (organized similar to a linked list kind of)
 */
function searchForBookmarks(bookmarkNode, currentArray) {
    /* bookmarkNode only has a url if it is a bookmark and not a folder, so, from what I have seen,
     * this if-condition will pass if bookmarkNode is a folder */
    if (bookmarkNode.url) {
        // Get the relevant information, converted to lowercase since the bookmark search (for now) will not be case-sensitive
        let title = bookmarkNode.title.toLowerCase();
        let searched = searchText.value.toLowerCase();

        // 3. While traversing through a bookmark, check if a part of its title is included in the search bar
        // Add the bookmark to currentArray if it contains searched (searchText) in its title
        if (title.indexOf(searched) != -1)
            currentArray.push(bookmarkNode);
    }

    // Recursively traverse to bookmarkNode's children nodes, if bookmarkNode has any
    if (bookmarkNode.children) {
        for (let i = 0; i < bookmarkNode.children.length; i++)
            searchForBookmarks(bookmarkNode.children[i], currentArray);
    }
}

/**
 * Converts an array of bookmarks to an HTML list containing the bookmarks' titles, their links (linked to the
 * titles), and their parent folder (if it exists).
 *
 * @param {Object} bookmarksArray An array containing the bookmarks that contain the user's input, searchText,
 *                                in their titles.
 *
 * @return {String}               An HTML-formatted list, formattedText, containing information on the bookmarks
 *                                in bookmarksArray.
 *CHANGE
 * Time complexity: O(c_total);   c_total = total # of characters across all bookmark titles in bookmarksArray
 *                                We need to traverse through each character in each title of each bookmark.
 *            or...
 *CHANGE
 * Time complexity: O(n * c_ave); n = # of bookmarks; c_ave = average # of characters in a bookmark title
 *                                Similar to O(c_total), in this case I am assuming that c_total = n * c_ave.
 *CAHNGE
 * Space complexity: O(1);        formatBookmarksToHTML does not call any other functions, so the only "call"
 *                                that would exist as a result of this function is formatBookmarksToHTML itself.
 */
function formatBookmarksToHTML(bookmarksArray) {
    // HTML-formatted list to be returned
    let formattedText = "";

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

        for (let j = 0; j < title.length; j++) {
            // Add the opening bold tag for the "searchText portion" of the title
            if (j == boldStartingIndex)
                formattedTitle += "<b>";

            formattedTitle += title[j];

            // Add the closing bold tag for the "searchText portion" of the title
            if (j == boldEndingIndex)
                formattedTitle += "</b>";
        }

        // Find the parent folder(s) of bookmarksArray[i], if it exists
        let parentFolders = [];
        getParentFolders(bookmarksArray[i], parentFolders);
        console.log(`AY ${parentFolders.length}`);
        // Format the parent folders into HTML
        let formattedParentFolders = "";
        for (let j = 0; j < formattedParentFolders.length; j++) {
            // Add an extra indent for each proceeding parent
            let indents = "&emsp;".repeat(j + 1);

            formattedParentFolders += `<br>;${indents}In: ${formattedParentFolders[j]}`;
        }

        // Make the HTML-formatted bookmark entry, and add it to formattedText
        let bookmarkEntry = linkOpeningTag + formattedTitle + linkClosingTag + formattedParentFolders;
        formattedText += bookmarkEntry;
    }

    return formattedText;
}

/**
 * Retrieves the folder(s) an inputted bookmark is housed in.
 *
 * @param {Object} bookmarkNode A bookmark/folder in Google Chrome's bookmark tree (Google Chrome stores
 *                              bookmarks in a tree). chrome for developers defines this to be of type
 *                              BookmarkTreeNode.
 *
 * @param {Object} parentsArray An array containing the parent, grandparent, etc. folders of the initially
 *                              inputted bookmarkNode. Will be added to throughout the course of the function,
 *                              with each element being the parent folder of the element to its left.
 *
 * @return {void}               getParentFolders does not return a value, however it may mutate parentsArray
 *                              if parent folders are found for bookmarkNode.
 *
 * Time complexity: O(n);       n = # of saved bookmarks
 *                              In the worst case, the bookmarks are the sole children/parents of one another
 *                              (organized similar to a linked list kind of)
 *
 * Space complexity: O(n);      n = # of saved bookmarks
 *                              In the worst case, the bookmarks are the sole children/parents of one another
 *                              (organized similar to a linked list kind of)
 */
function getParentFolders(bookmarkNode, parentsArray) {
    // Check if bookmarkNode has a parent folder
    if (bookmarkNode.parentId) {
        // If so, add the parent folder to parentsArray
        /*chrome.bookmarks.get(bookmarkNode.parentId, function(data) {
            parentsArray.push(data[0].title);
            console.log(`GOT HERE ${parentsArray.length}`);
            // Traverse up into the parent folder to look for its parent folder (if it exists)
            getParentFolders(data[0], parentsArray);
        });*/

        let test = chrome.bookmarks.get(bookmarkNode.parentId);
        test.then (
            function(value) {
                parentsArray.push(value[0].title);
                console.log(`GOT HERE ${parentsArray.length}`);
                getParentFolders(value[0], parentsArray);
            }
        );
    }

    console.log(`FINAL LENGTH: ${parentsArray.length}`);
}
