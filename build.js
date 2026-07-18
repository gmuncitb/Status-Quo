const { execSync } = require('child_process');

if (process.env.OPENNEXT_BUILDING) {
  // We are inside the opennextjs-cloudflare build wrapper, so run the actual Next.js compilation
  console.log("=== OpenNext Wrapper: Compiling Next.js App ===");
  execSync("npx next build --webpack", { stdio: "inherit" });
} else {
  // We are running the build command from outside (e.g. Cloudflare CI or local npm run build)
  console.log("=== OpenNext Wrapper: Initiating Cloudflare Bundle ===");
  execSync("npx opennextjs-cloudflare build", { 
    stdio: "inherit",
    env: { ...process.env, OPENNEXT_BUILDING: "true" }
  });
}
