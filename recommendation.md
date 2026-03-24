# Recommendations

-To improve the quality of this project there are a few things that could be implemented. First, a rate limiting to the backend services is a must for production environment. Also there are a few places (seed URL, search text box etc.) that could check inputs for expected formats. Visual dashboards for live crawl status and search outputs could be implemented too.
-Backend services are nowhere near production level quality. There is no persistence storage like a database. Occasional sanity checks and API health checks could be added to backend.
-I would use Apache Echarts for dashboards, PostgreSQL for persistent storage and maybe rewrite backend with Next.js if I wanted to improve quailty and maintainability of this project.
