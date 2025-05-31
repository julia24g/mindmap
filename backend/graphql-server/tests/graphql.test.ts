// Need to mock my DBs and insert some test data

// Before each test, we will insert some test data into the databases
// and after each test, we will clear the databases

// Query - content
// validate when contentID is wrong - make sure error handling is correct
// validate when contentID is correct - make sure we get all content information

// Query - get_user_graph
// validate when userId does not exist in DB - make sure we return an empty graph
// validate when userId exists in DB - make sure we return all nodes and edges correctly

// Query - get_all_tags
// validate when tags are empty - make sure we return an empty array
// validate we return same amount of tags we're expecting

// Mutation - add content 
// validate where all the input is correct
// validate where userId does not exist in DB

// Mutation - delete content
// validate when contentId does not exist in DB
// validate when contentId is correct