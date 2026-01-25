exports.shorthands = undefined;

exports.up = (pgm) => {
  // enable pgcrypto for gen_random_uuid()
  pgm.createExtension("pgcrypto", { ifNotExists: true });

  pgm.createTable("contents", {
    contentid: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    userid: { type: "uuid", notNull: true },
    title: { type: "text", notNull: true },
    type: { type: "text" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    properties: { type: "jsonb" },
  });

  pgm.createTable("users", {
    userid: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    firstname: { type: "text", notNull: true },
    lastname: { type: "text", notNull: true },
    email: { type: "text", notNull: true, unique: true },
    passwordhash: { type: "text", notNull: true },
    createdat: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    updatedat: { type: "timestamptz" },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("contents", { cascade: true });
  pgm.dropTable("users", { cascade: true });
  // optional: pgm.dropExtension('pgcrypto');
};
