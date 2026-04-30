const bcrypt = require("bcryptjs");

async function main() {
  const hash = await bcrypt.hash("Password123!", 10);
  console.log("Hash baru:", hash);
  console.log("\nJalankan SQL ini di phpMyAdmin:");
  console.log(`UPDATE pengguna SET password = '${hash}' WHERE email IN ('staf@polibatam.ac.id','kap4m@polibatam.ac.id','kaunit@polibatam.ac.id');`);
}
main();