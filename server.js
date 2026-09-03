require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/database");
const initNotifications = require("./src/notifications.init");
const logger = require("./src/utils/logger");

const PORT = process.env.PORT || 8000;

const startApp = async () => {
  try {
    await connectDB();
    await initNotifications();

    const server = app.listen(PORT, () => {
      logger.info(
        `SCORECARD Platform running on port ${PORT} [${process.env.NODE_ENV || "development"}]`,
      );
      logger.info(`API base:      http://localhost:${PORT}/api/v1`);
      logger.info(`Health check:  http://localhost:${PORT}/health`);
    });

    // `server` (lowercase) — the previous version referenced `Server` and
    // `derver`, so both shutdown paths threw ReferenceError instead of
    // closing cleanly.
    const shutdown = (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    process.on("unhandledRejection", (err) => {
      logger.error("UNHANDLED REJECTION:", err);
      server.close(() => process.exit(1));
    });
  } catch (error) {
    // console.error as well as the logger: winston's exceptionHandlers write to
    // logs/exceptions.log, which is what made the original startup crash appear
    // as a silent exit with no output at all.
    console.error("❌ Failed to initialize application:", error);
    logger.error("Failed to initialize application:", error);
    process.exit(1);
  }
};

startApp();
