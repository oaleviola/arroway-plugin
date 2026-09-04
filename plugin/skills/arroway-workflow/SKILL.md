---
name: arroway-workflow
description: How to work with Arroway, the team's shared memory. Use at the START of any task tied to a project — before planning, asserting, or changing anything — and again before you commit to a recommendation, and when the task ends. Triggers on any work inside a project the team tracks in Arroway.
---

# Working with Arroway

Arroway holds what this team decided and how things actually work. People curate it; every assistant on the team reads it. You share it with them — what you write reaches your teammates, and what they wrote reaches you.

The whole protocol is four moments. Three of them are cheap.

## 1. Read before acting

At the start of **any** task tied to a project, call `arroway_read` with that project's slug and a `task_context` describing what you are about to do. Extend your answer with what comes back.

Do this before you plan, before you assert, and before you change anything. The cost of skipping it is not a missing detail — it is confidently redoing work the team already did, or contradicting a decision someone already made.

The plugin may open a session with the last successfully delivered `arroway_norms` block for this directory. Treat that as norms context, not as a replacement for the task-scoped read above. If `arroway_read` comes back in parts, call `arroway_continue` with each preceding receipt and finish with `arroway_complete_read`; a part is not a completed read. If no block has ever been delivered here, the first mutating file or shell tool is stopped until a full read succeeds; a called, failed, refused or incomplete read does not count.

Starting a session rather than a task? `arroway_catch_up` reconstructs what happened recently across every project this person belongs to, day by day. That is the "where do things stand" read. It does not replace `arroway_read`, which answers "what does the team know about this".

Looking for **where a term or phrase appeared** in the recent dated log? Use `arroway_search_log`. It searches every project this person can access by default, or one project when you name it, and returns compact excerpts anchored by project, date and entry. It locates the record; it does not search curated memories and does not replace `arroway_read` before acting on a task.

**If two memories conflict, say so.** Never pick one silently.

## 2. Check the norms before you commit to a claim

In the seconds before you tell the person something or propose a course of action, call `arroway_norms`. It returns what is already decided for a fraction of the cost of a full read, and it exists for the moment when it is still cheap not to contradict.

It also hands you a **map**: the titles and handles of everything else that project remembers. Use it. If a title touches what you are doing, pull that one memory with `arroway_read include:["#handle"]` instead of assuming Arroway is silent about it.

Reading once at the start does not cover this moment. By the time you are about to assert, what you read may be far behind you.

## 3. Close the task — one of three ways, never none

Every task ends in exactly one of these. Choose deliberately; do not skip.

**You finished it → `arroway_log`.** Write the durable residue: what someone arriving later would need in order not to redo the work. What was decided, what was found, what changed, what it cost. No length rule — condense it yourself. Length is never free, though: write the shortest version that still carries the work, and leave out what only narrates it. Dated state (numbers, statuses) belongs here, where it ages out naturally.

**You stopped without finishing → `arroway_pass`.** Out of time, blocked, or told to stop: work you stop is *passed*, not dropped. Say where it stands, the single concrete next step, what must not be redone, and the risk left open. This is not a session dump — it is what the next session needs in order to continue without re-deriving anything.

**Nothing durable came out of it → say so.** End your reply with the sentence: No durable residue. This is a legitimate outcome and it costs one sentence. It has to *close* the reply — the phrase quoted mid-paragraph does not count, so that a turn merely discussing this rule cannot release itself by mentioning it. Never invent a log to look diligent: an empty entry costs every teammate who reads it afterwards.

Logging on completion is automatic — you do not ask permission for it.

## 4. Promote what should govern future work

Most tasks end at the log with nothing else to write — that is the normal outcome, not a gap. Read the entry back and put each candidate through one test: would it change what someone does on a **different** task, one you cannot see from here? What survives becomes its own memory via `arroway_remember`. What only explains what happened on this one is already in the log and belongs nowhere else.

**Know what it costs before you write it.** Only a **pinned** memory travels in every read of this project from now on. A normal memory competes for space in the block relevant to the task at hand — it comes back when it matches the work, and not otherwise. And before any of that, every proposal costs the person a review. A `rule` pins itself by default, so three questions decide whether it earns that seat: does breaking it cause expensive or irreversible damage · does it apply to every task, or only when someone touches one area · would the next person have found it anyway when they opened the relevant file? A rule that is discoverable where it matters is a reference or a fact. Pass `pin_suggested` explicitly to override the default.

**People count too.** When someone appears in the work — a partner, a client, a teammate, a named contact — and Arroway does not carry them yet, remember them as `identity`: who they are and how they relate. Identity never expires and never pins, so it costs nothing until that person is part of a task, and then it is there. Someone from this person's own circle belongs in their personal project; people of a business belong in that business's project. This is the layer that does not accrue on its own if you skip it — nobody writes down who their own wife is, and the assistant that meets her next week starts from nothing. The log never reaches the person's review, so whatever should govern future work — or deserves their veto — must not live only there.

**Provenance is the rule that matters most here.** Set `decided_by_human=true` **only** when the person stated or sanctioned it in this conversation. Your own inference is saved as a *proposal* for their review, which is the normal case — and a proposal is never free: it costs that person a review, whether they end up approving it, editing it or turning it down. A proposal never presents itself as a decision.

Every memory needs a `kill_condition`: what would kill it or force a review.

## Picking up work someone left in flight

An open handoff is served at the top of every read. If one is addressed to your user, take it — `arroway_claim` before you work on it, so parallel sessions do not duplicate the effort, and `arroway_close` alongside the `arroway_log` when it lands.

Addressed to someone else? Only a human present in the conversation can decide to take it anyway. An autonomous session leaves it. Claim is a visible mark, never a lock: it stops nobody, and a stale claim is information.

## What stays out

Credentials, tokens and passwords never go in, with no opt-out — that is an invariant of the system, not a preference. Anything else someone wants kept out is a personal rule written by audience, and it travels in their reads like any other rule.

Write about one project in that project. Never write one circle's material into another.
