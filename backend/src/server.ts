import { app } from "./app";
import { logger } from "./lib/logger";

const PORT = process.env.PORT ?? 3333;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
