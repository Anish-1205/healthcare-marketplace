import setupDatabase from './global-setup';

setupDatabase().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
