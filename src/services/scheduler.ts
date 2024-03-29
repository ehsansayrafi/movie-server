import { schedule } from "node-cron";
import Job from "../entities/job";
import updateMovies from "../jobs/update-movies";

const jobs = [
  {
    name: "updateMovies",
    fn: updateMovies,
    interval: 1000 * 3600 * 12, // 12 hours
  },
];

async function run() {
  await Promise.all(
    jobs.map(async ({ name, fn }) => {
      const job = await Job.findOne({ where: { name, processing: false } });
      if (!job) return;
      const now = Date.now();
      const lastRun =
        job.lastRun.toString() === "Invalid Date"
          ? now - job.interval
          : +new Date(job.lastRun);
      const shouldRun = lastRun + job.interval <= now;
      if (!shouldRun) return;
      await job.update({ processing: true, lastRun: new Date() });
      console.log(`[scheduler] start ${name}`);
      await fn();
      await job.update({ processing: false });
      console.log(`[scheduler] end ${name}`);
    })
  );
}

export default async function scheduler() {
  await Promise.all(
    jobs.map(async ({ name, interval }) => {
      const job = await Job.findOne({ where: { name } });
      if (!job) {
        await Job.create({ name: interval });
      } else {
        await job.update({ interval });
      }
    })
  );
  const processingJobs = await Job.findAll();
  await Promise.all(
    processingJobs.map((job) => job.update({ processing: false }))
  );
  run().finally(() => schedule("* * * * *", run));
}
