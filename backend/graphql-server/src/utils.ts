/**
 * Maps PostgreSQL user column names to GraphQL field names
 * PostgreSQL returns lowercase column names, GraphQL expects camelCase
 */
export function mapUserFromPostgres(user: any) {
  return {
    userId: user.userid,
    firstName: user.firstname,
    lastName: user.lastname,
    email: user.email,
    firebaseUid: user.firebaseuid,
    createdAt: user.createdat,
    updatedAt: user.updatedat
  };
}

/**
 * Maps an array of PostgreSQL user objects to GraphQL field names
 */
export function mapUsersFromPostgres(users: any[]) {
  return users.map(mapUserFromPostgres);
}

/**
 * Maps PostgreSQL content column names to GraphQL field names
 * PostgreSQL returns lowercase column names, GraphQL expects camelCase
 */
export function mapContentFromPostgres(content: any) {
  return {
    contentId: content.contentid,
    userId: content.userid,
    title: content.title,
    type: content.type,
    created_at: content.created_at,
    properties: content.properties
  };
}

/**
 * Maps an array of PostgreSQL content objects to GraphQL field names
 */
export function mapContentsFromPostgres(contents: any[]) {
  return contents.map(mapContentFromPostgres);
} 