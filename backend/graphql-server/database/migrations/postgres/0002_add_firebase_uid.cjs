exports.shorthands = undefined;

exports.up = (pgm) => {
  // Add firebaseUid column (required for all users)
  pgm.addColumn('users', {
    firebaseuid: { 
      type: 'text',
      notNull: true,
      unique: true,
    },
  });

  // Drop passwordhash column as we're moving to Firebase auth
  pgm.dropColumn('users', 'passwordhash');
};

exports.down = (pgm) => {
  // Revert: add passwordhash back
  pgm.addColumn('users', {
    passwordhash: { type: 'text', notNull: false },
  });

  // Drop firebaseuid column
  pgm.dropColumn('users', 'firebaseuid');
};
