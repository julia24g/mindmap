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