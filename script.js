// 1. Event listener for the search bar (not sure if this would happen if the user enters or if there is ANY input yk)

// 2. Google's bookmarks are stored in a tree, gotta traverse through all bookmarks

// 3. While traversing through bookmarks, check if the... name?? is included in the search bar (idk about keywords yet)

// 4. If the name is in the search bar, add it to the results text somehow idk

// 5. Somehow allow this process to occur continuously in case the user searches diff things (rn assuming that this happens automatically)

// Do we store the bookmarks in a list??







// Get the relevant elements
const searchText = document.getElementById("search-text");
const resultsText = document.getElementById("results-text");

// Wait for user input (in which case, search for bookmarks)
searchText.addEventListener("input", displayBookmarks);

/**
 * Searches for bookmarks from an inputted searchText, and displays the bookmarks to resultsText.
 *
 * searchForBookmarks does not require any parameters.
 *
 * @return {void}         searchForBookmarks does not return a value, however it may mutate
 *                        resultsText if any bookmarks are found through searchText.
 */
function displayBookmarks() {
    if (searchText.value == "")
        resultsText.innerHTML = "Results go here..."
    else
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


        chrome.bookmarks.getTree(function (data1) {

            chrome.bookmarks.search(data1, function(data2) {
                let finalText = "";
                for (let i = 0; i < data.length; i++) {

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
            });

        });


}

function searchBookmarks(value) {


}
