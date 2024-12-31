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
    if (bookmarkNode.url) {
        let title = bookmarkNode.title.toLowerCase();
        let searched = searchText.value.toLowerCase();
        if (title.indexOf(searched) != -1)
            currentArray.push(bookmarkNode);
    }

    if (bookmarkNode.children) {
        for (let i = 0; i < bookmarkNode.children.length; i++)
            searchForBookmarks(bookmarkNode.children[i], currentArray);
    }
}

function formatBookmarksToHTML(bookmarksArray) {
    let formattedText = "";

    for (let i = 0; i < bookmarksArray.length; i++) {
        if (i != 0)
            formattedText += "<br><br>"



        let title = bookmarksArray[i].title;
        let url = bookmarksArray[i].url;

        let linkOpeningTag = "<a href=" + '"' + url + '">';
        let linkClosingTag = "</a>";

        formattedText += linkOpeningTag;

        let start = title.toLowerCase().indexOf(searchText.value.toLowerCase());
        let end = start + searchText.value.length;

        for (let j = 0; j < start; j++)
            formattedText += title[j];

        let bold = "<b>";
        for (let j = start; j < end; j++)
            bold += title[j];

        bold += "</b>";

        formattedText += bold;

        for (let k = end; k < title.length; k++)
            formattedText += title[k];

        //formattedText += bookmarksArray[i].title;
        formattedText += linkClosingTag;

        /*
        formattedText += bookmarksArray[i].title;

        formattedText += "<br>";
        formattedText += "&emsp;";

        formattedText += bookmarksArray[i].url;
        */
    }

    return formattedText;
}
