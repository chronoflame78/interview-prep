import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { Difficulty } from "../src/generated/prisma/enums";
import bcrypt from "bcryptjs";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // ─── Domains ───
  const domainsData = [
    { name: "Software Engineering", slug: "software-engineering" },
    { name: "Finance", slug: "finance" },
    { name: "Journalism", slug: "journalism" },
  ];

  const domainMap: Record<string, string> = {};
  for (const d of domainsData) {
    const domain = await prisma.domain.upsert({
      where: { slug: d.slug },
      update: {},
      create: { name: d.name, slug: d.slug },
    });
    domainMap[d.name] = domain.id;
  }
  console.log("Domains seeded:", Object.keys(domainMap).length);

  const seDomainId = domainMap["Software Engineering"];
  const finDomainId = domainMap["Finance"];
  const jourDomainId = domainMap["Journalism"];

  // ─── Admin User ───
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "changeme";
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { activeDomainId: seDomainId },
    create: {
      email: adminEmail,
      name: "Admin",
      password: hashedPassword,
      role: "ADMIN",
      activeDomainId: seDomainId,
    },
  });
  console.log("Admin user created:", admin.email);

  // Backfill: assign all existing users without a domain to Software Engineering
  await prisma.user.updateMany({
    where: { activeDomainId: null },
    data: { activeDomainId: seDomainId },
  });

  // Backfill: assign all existing topics/questions without a domain to Software Engineering
  await prisma.topic.updateMany({
    where: { domainId: null },
    data: { domainId: seDomainId },
  });
  await prisma.question.updateMany({
    where: { domainId: null },
    data: { domainId: seDomainId },
  });

  // ─── Software Engineering Topics ───
  const seTopicsData = [
    { name: "JavaScript", subTopics: ["Closures", "Promises", "Event Loop", "Prototypes", "ES6+"] },
    { name: "TypeScript", subTopics: ["Generics", "Type Guards", "Utility Types", "Decorators"] },
    { name: "React", subTopics: ["Hooks", "State Management", "Performance", "Patterns"] },
    { name: "Next.js", subTopics: ["App Router", "SSR/SSG", "API Routes", "Middleware"] },
    { name: "Node.js", subTopics: ["Streams", "Clustering", "Event Emitters", "Security"] },
    { name: "SQL & Databases", subTopics: ["Joins", "Indexing", "Transactions", "Normalization"] },
    { name: "System Design", subTopics: ["Scalability", "Caching", "Load Balancing", "Microservices"] },
    { name: "Data Structures", subTopics: ["Arrays", "Trees", "Graphs", "Hash Tables"] },
    { name: "Algorithms", subTopics: ["Sorting", "Searching", "Dynamic Programming", "Recursion"] },
    { name: "HTML & CSS", subTopics: ["Flexbox", "Grid", "Accessibility", "Responsive Design"] },
    { name: "Git", subTopics: ["Branching", "Rebasing", "Merge Conflicts", "Workflows"] },
    { name: "DevOps", subTopics: ["CI/CD", "Docker", "Kubernetes", "Monitoring"] },
  ];

  // ─── Finance Topics ───
  const finTopicsData = [
    { name: "Accounting Principles", subTopics: ["GAAP", "IFRS", "Revenue Recognition", "Balance Sheet"] },
    { name: "Financial Modeling", subTopics: ["DCF Analysis", "LBO Models", "Comparable Analysis", "Forecasting"] },
    { name: "Investment Banking", subTopics: ["M&A", "IPO Process", "Valuation", "Deal Structuring"] },
    { name: "Risk Management", subTopics: ["Market Risk", "Credit Risk", "Operational Risk", "Hedging"] },
    { name: "Corporate Finance", subTopics: ["Capital Structure", "Working Capital", "Dividends", "Cost of Capital"] },
  ];

  // ─── Journalism Topics ───
  const jourTopicsData = [
    { name: "Investigative Reporting", subTopics: ["Source Development", "FOIA Requests", "Data Analysis", "Verification"] },
    { name: "Ethics in Journalism", subTopics: ["Objectivity", "Conflicts of Interest", "Privacy", "Corrections"] },
    { name: "Digital Media", subTopics: ["Social Media", "SEO", "Podcasting", "Video Production"] },
    { name: "Broadcast News", subTopics: ["Anchoring", "Field Reporting", "Live Coverage", "Editing"] },
    { name: "Feature Writing", subTopics: ["Narrative Structure", "Interviewing", "Long-form", "Profiles"] },
  ];

  const topicMap: Record<string, string> = {};
  const subTopicMap: Record<string, string> = {};

  async function seedTopics(
    topicsData: { name: string; subTopics: string[] }[],
    domainId: string
  ) {
    for (const t of topicsData) {
      const topic = await prisma.topic.upsert({
        where: {
          name_createdBy_domainId: { name: t.name, createdBy: admin.id, domainId },
        },
        update: {},
        create: { name: t.name, isDefault: true, createdBy: null, domainId },
      });
      topicMap[t.name] = topic.id;

      for (const subName of t.subTopics) {
        const sub = await prisma.subTopic.upsert({
          where: {
            name_topicId_createdBy: {
              name: subName,
              topicId: topic.id,
              createdBy: admin.id,
            },
          },
          update: {},
          create: {
            name: subName,
            topicId: topic.id,
            isDefault: true,
            createdBy: null,
          },
        });
        subTopicMap[`${t.name}:${subName}`] = sub.id;
      }
    }
  }

  await seedTopics(seTopicsData, seDomainId);
  await seedTopics(finTopicsData, finDomainId);
  await seedTopics(jourTopicsData, jourDomainId);
  console.log("Topics seeded:", Object.keys(topicMap).length);

  // ─── Software Engineering Questions ───
  const seQuestionsData: {
    question: string;
    answer: string;
    difficulty: Difficulty;
    topic: string;
    subTopic?: string;
  }[] = [
    {
      question: "<p>What is a closure in JavaScript and why is it useful?</p>",
      answer:
        "<p>A closure is a function that retains access to its outer scope's variables even after the outer function has returned. Closures are useful for data encapsulation, creating private variables, and in patterns like function factories and callbacks.</p><pre><code>function counter() {\n  let count = 0;\n  return {\n    increment: () => ++count,\n    getCount: () => count\n  };\n}</code></pre>",
      difficulty: "MEDIUM",
      topic: "JavaScript",
      subTopic: "Closures",
    },
    {
      question: "<p>Explain the JavaScript event loop.</p>",
      answer:
        "<p>The event loop is the mechanism that allows JavaScript to perform non-blocking operations despite being single-threaded. It continuously checks the call stack and the callback queue. When the stack is empty, it moves the first callback from the queue to the stack for execution.</p><p><strong>Key components:</strong></p><ul><li>Call Stack - executes synchronous code</li><li>Web APIs - handle async operations (setTimeout, fetch, etc.)</li><li>Callback Queue (Task Queue) - holds callbacks ready to execute</li><li>Microtask Queue - higher priority (Promises, queueMicrotask)</li></ul>",
      difficulty: "HARD",
      topic: "JavaScript",
      subTopic: "Event Loop",
    },
    {
      question: "<p>What is the difference between <code>var</code>, <code>let</code>, and <code>const</code>?</p>",
      answer:
        "<p><strong>var:</strong> Function-scoped, hoisted, can be re-declared.</p><p><strong>let:</strong> Block-scoped, not hoisted (TDZ), cannot be re-declared in the same scope.</p><p><strong>const:</strong> Block-scoped, not hoisted (TDZ), cannot be reassigned (but objects/arrays can be mutated).</p>",
      difficulty: "EASY",
      topic: "JavaScript",
      subTopic: "ES6+",
    },
    {
      question: "<p>What are TypeScript generics and when would you use them?</p>",
      answer:
        "<p>Generics allow you to create reusable components that work with multiple types while maintaining type safety. They act as type variables.</p><pre><code>function identity&lt;T&gt;(arg: T): T {\n  return arg;\n}\n\ninterface ApiResponse&lt;T&gt; {\n  data: T;\n  status: number;\n}</code></pre><p>Use generics when you want a function or class to work with different types while preserving the relationship between input and output types.</p>",
      difficulty: "MEDIUM",
      topic: "TypeScript",
      subTopic: "Generics",
    },
    {
      question: "<p>Explain the difference between <code>useEffect</code> and <code>useLayoutEffect</code>.</p>",
      answer:
        "<p><strong>useEffect:</strong> Runs asynchronously after the browser has painted. Best for most side effects (data fetching, subscriptions, logging).</p><p><strong>useLayoutEffect:</strong> Runs synchronously after DOM mutations but before the browser paints. Use it when you need to measure or mutate the DOM before the user sees the update (e.g., calculating element dimensions, preventing visual flicker).</p>",
      difficulty: "MEDIUM",
      topic: "React",
      subTopic: "Hooks",
    },
    {
      question: "<p>What are React Server Components and how do they differ from Client Components?</p>",
      answer:
        "<p><strong>Server Components:</strong></p><ul><li>Rendered on the server only</li><li>Can directly access databases and file systems</li><li>Cannot use hooks or browser APIs</li><li>Zero client-side JavaScript bundle impact</li></ul><p><strong>Client Components:</strong></p><ul><li>Marked with <code>'use client'</code></li><li>Can use hooks, state, effects, and browser APIs</li><li>Hydrated on the client</li><li>Add to the JavaScript bundle</li></ul><p>Use Server Components by default; only use Client Components when you need interactivity.</p>",
      difficulty: "MEDIUM",
      topic: "React",
      subTopic: "Patterns",
    },
    {
      question: "<p>What is the difference between SSR, SSG, and ISR in Next.js?</p>",
      answer:
        "<p><strong>SSR (Server-Side Rendering):</strong> Page is rendered on each request. Use for dynamic, personalized content.</p><p><strong>SSG (Static Site Generation):</strong> Page is pre-rendered at build time. Best for content that doesn't change often.</p><p><strong>ISR (Incremental Static Regeneration):</strong> Static pages that revalidate after a specified interval. Combines the speed of SSG with the freshness of SSR.</p>",
      difficulty: "EASY",
      topic: "Next.js",
      subTopic: "SSR/SSG",
    },
    {
      question: "<p>Explain database indexing and when you should (and shouldn't) use indexes.</p>",
      answer:
        "<p>An index is a data structure (typically a B-tree) that improves the speed of data retrieval at the cost of additional storage and slower writes.</p><p><strong>Use indexes when:</strong></p><ul><li>Columns are frequently used in WHERE clauses</li><li>Columns used in JOIN conditions</li><li>Columns used in ORDER BY</li></ul><p><strong>Avoid indexes when:</strong></p><ul><li>Tables are small</li><li>Columns with low cardinality (few distinct values)</li><li>Tables with heavy write operations</li><li>Columns rarely used in queries</li></ul>",
      difficulty: "MEDIUM",
      topic: "SQL & Databases",
      subTopic: "Indexing",
    },
    {
      question: "<p>Design a URL shortening service like bit.ly.</p>",
      answer:
        "<p><strong>Requirements:</strong> Generate short URLs, redirect to original URLs, handle high read throughput.</p><p><strong>Approach:</strong></p><ol><li><strong>Encoding:</strong> Base62 encode an auto-increment ID or use a hash (MD5/SHA256) truncated to 6-8 chars</li><li><strong>Database:</strong> Key-value store (Redis) for hot reads + relational DB for persistence</li><li><strong>Caching:</strong> Cache popular URLs in Redis/Memcached</li><li><strong>Scaling:</strong> Horizontal scaling with load balancer, database sharding by hash prefix</li></ol><p><strong>Key considerations:</strong> Handle collisions, rate limiting, analytics, expiration.</p>",
      difficulty: "HARD",
      topic: "System Design",
      subTopic: "Scalability",
    },
    {
      question: "<p>What is the time complexity of common operations on a hash table?</p>",
      answer:
        "<p><strong>Average case:</strong></p><ul><li>Insert: O(1)</li><li>Lookup: O(1)</li><li>Delete: O(1)</li></ul><p><strong>Worst case (many collisions):</strong></p><ul><li>All operations: O(n)</li></ul><p>Hash tables achieve O(1) average by using a hash function to compute an index. Collisions are handled via chaining (linked lists) or open addressing (probing).</p>",
      difficulty: "EASY",
      topic: "Data Structures",
      subTopic: "Hash Tables",
    },
    {
      question: "<p>Explain the concept of dynamic programming with an example.</p>",
      answer:
        "<p>Dynamic programming (DP) solves complex problems by breaking them into overlapping subproblems and storing results to avoid redundant computation.</p><p><strong>Example: Fibonacci</strong></p><pre><code>// Top-down (memoization)\nfunction fib(n, memo = {}) {\n  if (n <= 1) return n;\n  if (memo[n]) return memo[n];\n  memo[n] = fib(n-1, memo) + fib(n-2, memo);\n  return memo[n];\n}\n\n// Bottom-up (tabulation)\nfunction fib(n) {\n  const dp = [0, 1];\n  for (let i = 2; i <= n; i++) {\n    dp[i] = dp[i-1] + dp[i-2];\n  }\n  return dp[n];\n}</code></pre><p><strong>Key properties:</strong> Optimal substructure + overlapping subproblems.</p>",
      difficulty: "HARD",
      topic: "Algorithms",
      subTopic: "Dynamic Programming",
    },
    {
      question: "<p>What is the CSS Box Model?</p>",
      answer:
        "<p>Every HTML element is a rectangular box consisting of (from inside out):</p><ol><li><strong>Content</strong> - the actual content (text, images)</li><li><strong>Padding</strong> - space between content and border</li><li><strong>Border</strong> - the border around the padding</li><li><strong>Margin</strong> - space outside the border</li></ol><p><code>box-sizing: content-box</code> (default) — width/height only applies to content.</p><p><code>box-sizing: border-box</code> — width/height includes padding and border (recommended).</p>",
      difficulty: "EASY",
      topic: "HTML & CSS",
      subTopic: "Responsive Design",
    },
    {
      question: "<p>What is git rebase and when should you use it instead of merge?</p>",
      answer:
        "<p><strong>Rebase</strong> replays your branch's commits on top of another branch, creating a linear history.</p><p><strong>Merge</strong> creates a merge commit that combines two branches, preserving the branching history.</p><p><strong>Use rebase when:</strong></p><ul><li>You want a clean, linear commit history</li><li>Updating a feature branch with latest main changes</li><li>Before submitting a PR</li></ul><p><strong>Use merge when:</strong></p><ul><li>Working on shared/public branches</li><li>You want to preserve the full history of when branches diverged</li></ul><p><strong>Golden rule:</strong> Never rebase commits that have been pushed and shared with others.</p>",
      difficulty: "MEDIUM",
      topic: "Git",
      subTopic: "Rebasing",
    },
    {
      question: "<p>What is Docker and why is it useful for development?</p>",
      answer:
        '<p>Docker is a containerization platform that packages applications with their dependencies into lightweight, portable containers.</p><p><strong>Benefits:</strong></p><ul><li><strong>Consistency:</strong> "Works on my machine" solved — same environment everywhere</li><li><strong>Isolation:</strong> Each container runs independently</li><li><strong>Portability:</strong> Run anywhere Docker is installed</li><li><strong>Efficiency:</strong> Lighter than VMs, shares the host OS kernel</li></ul><p><strong>Key concepts:</strong> Dockerfile (build instructions), Image (template), Container (running instance), Volume (persistent data), Docker Compose (multi-container apps).</p>',
      difficulty: "EASY",
      topic: "DevOps",
      subTopic: "Docker",
    },
    {
      question: "<p>What are Promises in JavaScript? How do they differ from callbacks?</p>",
      answer:
        "<p>A Promise is an object representing the eventual completion or failure of an async operation.</p><p><strong>States:</strong> pending → fulfilled or rejected</p><pre><code>const promise = new Promise((resolve, reject) => {\n  asyncOperation((err, data) => {\n    if (err) reject(err);\n    else resolve(data);\n  });\n});\n\npromise\n  .then(data => console.log(data))\n  .catch(err => console.error(err));</code></pre><p><strong>Advantages over callbacks:</strong></p><ul><li>Avoids callback hell (better chaining)</li><li>Built-in error handling with .catch()</li><li>Composable with Promise.all, Promise.race, etc.</li><li>Works with async/await syntax</li></ul>",
      difficulty: "MEDIUM",
      topic: "JavaScript",
      subTopic: "Promises",
    },
  ];

  // ─── Finance Questions ───
  const finQuestionsData: {
    question: string;
    answer: string;
    difficulty: Difficulty;
    topic: string;
    subTopic?: string;
  }[] = [
    {
      question: "<p>Walk me through a DCF analysis.</p>",
      answer:
        "<p>A Discounted Cash Flow (DCF) analysis values a company based on its projected future cash flows, discounted back to present value.</p><p><strong>Steps:</strong></p><ol><li>Project free cash flows (FCF) for 5-10 years</li><li>Calculate the terminal value (using perpetuity growth or exit multiple)</li><li>Determine the discount rate (WACC)</li><li>Discount all cash flows to present value</li><li>Sum to get enterprise value, then subtract net debt for equity value</li></ol><p><strong>Key assumptions:</strong> Revenue growth rate, margins, capex, working capital changes, terminal growth rate, WACC.</p>",
      difficulty: "MEDIUM",
      topic: "Financial Modeling",
      subTopic: "DCF Analysis",
    },
    {
      question: "<p>What are the three main financial statements and how are they linked?</p>",
      answer:
        "<p><strong>1. Income Statement</strong> — shows profitability (revenue, expenses, net income)</p><p><strong>2. Balance Sheet</strong> — shows financial position (assets = liabilities + equity)</p><p><strong>3. Cash Flow Statement</strong> — shows cash movements (operating, investing, financing)</p><p><strong>Links:</strong></p><ul><li>Net income from the income statement flows to retained earnings on the balance sheet</li><li>Net income is the starting point of the cash flow statement (operating section)</li><li>Cash on the cash flow statement ties to cash on the balance sheet</li><li>Depreciation from the income statement is added back in the cash flow statement</li></ul>",
      difficulty: "EASY",
      topic: "Accounting Principles",
      subTopic: "Balance Sheet",
    },
    {
      question: "<p>Explain the difference between enterprise value and equity value.</p>",
      answer:
        "<p><strong>Enterprise Value (EV)</strong> = Equity Value + Net Debt + Minority Interest + Preferred Stock - Cash</p><p><strong>Equity Value (Market Cap)</strong> = Share Price × Shares Outstanding</p><p>EV represents the total value of a business to all stakeholders (debt and equity holders). Equity value represents just the value attributable to shareholders.</p><p><strong>When to use:</strong></p><ul><li>EV-based multiples (EV/EBITDA, EV/Revenue) for comparing companies with different capital structures</li><li>Equity-based multiples (P/E) when capital structure is similar</li></ul>",
      difficulty: "MEDIUM",
      topic: "Investment Banking",
      subTopic: "Valuation",
    },
  ];

  // ─── Journalism Questions ───
  const jourQuestionsData: {
    question: string;
    answer: string;
    difficulty: Difficulty;
    topic: string;
    subTopic?: string;
  }[] = [
    {
      question: "<p>What are the key principles of journalistic ethics?</p>",
      answer:
        "<p>The core principles include:</p><ul><li><strong>Truth and Accuracy</strong> — verify facts, provide context, attribute sources</li><li><strong>Independence</strong> — avoid conflicts of interest, don't accept gifts that could influence coverage</li><li><strong>Fairness and Impartiality</strong> — present all sides, distinguish news from opinion</li><li><strong>Minimizing Harm</strong> — balance the public's right to know with potential harm to individuals</li><li><strong>Accountability</strong> — correct errors promptly, be transparent about methods</li></ul><p>These principles guide editorial decision-making and maintain public trust in journalism.</p>",
      difficulty: "EASY",
      topic: "Ethics in Journalism",
      subTopic: "Objectivity",
    },
    {
      question: "<p>How do you protect confidential sources?</p>",
      answer:
        "<p><strong>Methods for source protection:</strong></p><ul><li>Use encrypted communication (Signal, SecureDrop)</li><li>Never store source identity on networked devices</li><li>Use anonymous attribution in published stories</li><li>Understand shield laws in your jurisdiction</li><li>Be prepared to face legal consequences rather than reveal a source</li></ul><p><strong>Key considerations:</strong></p><ul><li>Negotiate terms of confidentiality upfront</li><li>Document the source's reliability without identifying them</li><li>Consider the legal and ethical implications before promising confidentiality</li></ul>",
      difficulty: "MEDIUM",
      topic: "Investigative Reporting",
      subTopic: "Source Development",
    },
    {
      question: "<p>What makes a compelling long-form feature story?</p>",
      answer:
        "<p>A great feature story combines:</p><ul><li><strong>Narrative arc</strong> — a clear beginning, rising tension, and resolution</li><li><strong>Human element</strong> — real people whose experiences drive the story</li><li><strong>Scene-setting</strong> — vivid, specific details that place the reader in the moment</li><li><strong>Significance</strong> — connects individual stories to larger themes or systemic issues</li><li><strong>Strong voice</strong> — distinctive writing that engages the reader</li></ul><p><strong>Structure tips:</strong> Open with a compelling scene or anecdote, use the nut graf to explain why the story matters, alternate between narrative scenes and expository sections.</p>",
      difficulty: "MEDIUM",
      topic: "Feature Writing",
      subTopic: "Long-form",
    },
  ];

  async function seedQuestions(
    questionsData: { question: string; answer: string; difficulty: Difficulty; topic: string; subTopic?: string }[],
    domainId: string
  ) {
    for (const q of questionsData) {
      const topicId = topicMap[q.topic];
      const subTopicId = q.subTopic ? subTopicMap[`${q.topic}:${q.subTopic}`] : undefined;

      await prisma.question.create({
        data: {
          question: q.question,
          answer: q.answer,
          difficulty: q.difficulty,
          isDefault: true,
          createdBy: admin.id,
          domainId,
          topics: topicId ? { create: { topicId } } : undefined,
          subTopics: subTopicId ? { create: { subTopicId } } : undefined,
        },
      });
    }
  }

  await seedQuestions(seQuestionsData, seDomainId);
  await seedQuestions(finQuestionsData, finDomainId);
  await seedQuestions(jourQuestionsData, jourDomainId);
  console.log("Questions seeded:", seQuestionsData.length + finQuestionsData.length + jourQuestionsData.length);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
