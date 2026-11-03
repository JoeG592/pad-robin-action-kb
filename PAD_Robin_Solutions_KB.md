# PAD Robin Solutions KB

**Version 1.0.**

How to move a Power Platform solution from one environment to another with code, without the portal: inside one tenant, and into a different organization's tenant. It covers export, import, connection references, turning flows on afterwards, signing in to two tenants, and keeping two copies of a solution in sync. Every claim is marked with how sure it is.

It sits beside the other files in this repo. The Action KB (`PAD_Robin_ActionKB.json`) answers "what Robin will PAD accept?", the Deployment KB (`PAD_Robin_Deployment_KB.md`) answers "how do I get one flow into an environment and run it?", and this one answers "how do I move a whole solution, and keep it moving?".

The material comes from building a solution sync tool three times: PowerShell scripts, then a browser extension with a server, then a browser extension that calls Dataverse directly with no server. Where the three disagreed, the newest one is described and the older approach is marked Superseded.

| Mark | Meaning |
|---|---|
| **Re-confirmed** | Proven earlier and re-run on 2026-10-21 with the same result |
| **Proven** | Done end to end and checked, between 2026-01-29 and 2026-10-21 |
| **Measured** | A one-off result (a duration or a count) from a single run between 2026-01-29 and 2026-10-21 |
| **Superseded** | Was believed or used, later replaced (the replacement is named) |
| **Failed** | Tried and did not work |
| **Untested** | Believed, or built but never checked against a real environment |

All tests ran with delegated (user) sign-in and unmanaged solutions, in two tenants: one with two Dataverse environments, one with one. Managed solutions were tested only as far as one export and import (section 4). Nothing here was tested with a service principal.

## 1. The paths at a glance

| Path | What's different | A person must... | Status |
|---|---|---|---|
| **Same tenant, another environment** | One sign-in covers both environments. Connections are per environment, so they still have to exist on the receiving side | create each connection once on the receiving environment | **Re-confirmed** |
| **Another tenant** | Two sign-ins, one per tenant. The receiving tenant needs a license, a service principal and a role before the first import (section 2) | sign in to both tenants; create each connection once on the receiving side | **Re-confirmed** |
| **Two-way sync** | Both copies can change. You need change detection, a direction rule and a conflict rule (section 8) | resolve conflicts | **Proven** |

Three findings hold on every path:

- **The import never creates connections.** A connection is an OAuth sign-in, and it can't be created headlessly (Deployment KB, section 4). The import can *bind* the solution's connection references to connections that already exist (section 5). Plan the user experience around that one manual step.
- **Don't trust the state after import.** Read which flows are on, bind what's unbound, then turn on the flows that are on in the source (section 6).
- **An export is never byte-identical to the last one.** Hashing the ZIP to detect changes always reports a change. Hash the contents instead, and leave out the files that change on every export (section 8).

---

## 2. Signing in to two tenants

Both routes work. The newer build uses authorization code with PKCE from a browser extension (**Proven**); the older one used device code through a server. Device code with the same multi-tenant app registration, from a PowerShell script, signed in to both tenants (**Re-confirmed**).

### One refresh token per tenant

Sign in once per tenant with `offline_access` and keep that tenant's refresh token. Redeem it with the refresh-token grant for each resource you need, changing only the `scope`:

| Resource | Scope |
|---|---|
| Dataverse (each org) | `https://<org>.crm<N>.dynamics.com/.default` |
| Power Apps API (environments, connections) | `https://service.powerapps.com/.default` |

The authority was `https://login.microsoftonline.com/organizations/oauth2/v2.0`. One refresh token mints tokens for every org in its tenant (**Re-confirmed**: one refresh token gave tokens for both environments in one tenant and for the Power Apps API). Cache access tokens per tenant and resource, and refresh a few minutes before they expire.

### The app registration

One multi-tenant app registration served both tenants. It needs delegated permissions **Dynamics CRM `user_impersonation`** and **PowerApps Service `User`**, consented in each tenant. A browser extension using authorization code also needs a **Single-page application** redirect URI for its redirect URL (`https://<extension-id>.chromiumapp.org/`). Register your own; don't borrow another product's client ID.

- **Untested:** first-time consent in a tenant that has never seen the app. Both test tenants had already consented.
- **Superseded:** the first PowerShell scripts borrowed Microsoft's well-known Dynamics CRM public client ID and called the tenant-specific endpoint (`/<tenantId>/oauth2/v2.0/devicecode`; `/common` failed for that client). A dedicated multi-tenant registration replaced it.
- **Device code from a browser extension** fails with `AADSTS9002326`; redeem it on a server instead (Deployment KB, section 2).

### Signing in to the right tenant

- **Microsoft will give you a token for an org in a different tenant than the account you signed in with,** and Dataverse then answers with an **empty HTTP 401** (**Re-confirmed**: the token carried the org as its audience and the account's own tenant id). It happened three times in testing, every time because the account picker chose the other account. Store each side's tenant ID, and after every sign-in check that the org appears in that tenant's environment list (section 3). Show "you signed in as X, but this org belongs to another tenant" instead of a bare 401.
- **Silent sign-in with two accounts signed in fails** with `AADSTS16000` (multiple user identities available). Pass the account's UPN as `login_hint` with `prompt=none`; with it, the right tenant came back every time (**Proven**).
- The token response had no `refresh_token_expires_in` (**Re-confirmed**). Don't rely on it.

### The receiving tenant

**Proven.** Before the first import into another organization's tenant, the receiving side needed all four of these. Each one came from a real error:

| Needed | Error without it |
|---|---|
| A Power Automate license for the signing-in user (a Premium trial was enough) | `AADSTS650052`, together with the missing service principal below |
| The Dataverse (Common Data Service) service principal in the tenant, created with `New-MgServicePrincipal -AppId <app id>` | `AADSTS650052` |
| The System Administrator security role in the receiving environment | HTTP 403 naming the `prvCreateEntity` privilege |
| Admin consent for your app registration | consent prompt, or `AADSTS65001` |

- The notes disagree on whether the license or the service principal fixed `AADSTS650052` on its own; both were done. **Untested:** which one is enough.
- `AADSTS65001` (consent_required) also appeared when the receiving side was asked for a Graph token instead of a Dataverse token. Ask for the Dataverse scope of the receiving org.

---

## 3. Finding the solution and the environment

**Re-confirmed.** Dataverse Web API v9.2, headers `Accept: application/json`, `OData-MaxVersion: 4.0`, `OData-Version: 4.0`.

| What | Request |
|---|---|
| Unmanaged solutions you can move | `GET solutions?$filter=ismanaged eq false and isvisible eq true&$select=uniquename,friendlyname,version` (skip `Default`, `Active` and `Basic`) |
| One solution | `GET solutions?$filter=uniquename eq '<name>'&$select=solutionid,uniquename,version,modifiedon` |
| Environments in the tenant | `GET https://api.powerapps.com/providers/Microsoft.PowerApps/environments?api-version=2016-11-01` |
| Connections in an environment | `GET https://api.powerapps.com/providers/Microsoft.PowerApps/connections?api-version=2016-11-01&$filter=environment eq '<envId>'` |

- **Matching an org to its environment:** compare the org host with `properties.linkedEnvironmentMetadata.instanceUrl`. That URL ends with a slash, so normalize both before comparing. The default environment's id is `Default-<tenantId>`, not anything derived from the org URL.
- **Filter connections by the environment you're importing into.** **Superseded:** an early script read connections from the default environment while importing into another one, and none of 16 references could be bound. Filtering by the right environment bound all 16.
- **Connection ids come in several formats, even within one environment:** a plain 32-character id, `shared-<connector>-<guid>`, and a GUID with dashes. Store them exactly as returned.
- Escape a single quote in an OData string by doubling it.

---

## 4. Export

**Re-confirmed.**

```
POST https://<org>/api/data/v9.2/ExportSolution
{ "SolutionName": "<uniquename>", "Managed": false }
```

The response's `ExportSolutionFile` is the solution ZIP, base64-encoded.

- Synchronous `ExportSolution` was fast enough for every solution tested (7 to 33 seconds for a 65 KB solution, **Measured**), so the async export (`ExportSolutionAsync` + `DownloadSolutionExportData`) was never used. **Untested** for large solutions.
- **Managed export** (**Proven**, once): `"Managed": true` gave a ZIP with `<Managed>1</Managed>` in `solution.xml`, and it imported into another environment with the async call; the solution and its flow arrived managed, and the flow on. A managed solution can't be exported again from where it landed: `0x80048036`, "Managed solutions cannot be exported". Everything else here moved unmanaged solutions, which suits two copies that both get edited. For a one-way release to a production environment, Microsoft's usual advice is managed solutions; upgrades of them aren't covered (section 5).
- **Building a solution from loose flows** (**Proven**): create a publisher (`POST publishers` with a `customizationprefix`), create a solution bound to it (`"publisherid@odata.bind": "/publishers(<id>)"`), add each flow with `AddSolutionComponent` (`ComponentType: 29`, `AddRequiredComponents: false`), then export.
- **Moving only some components: Failed.** A script removed folders and XML nodes from the exported ZIP to move only the flows, but the matching entries in `solution.xml` weren't adjusted, and only "12 connection references removed" was checked. Use a smaller solution instead.
- **Reading the ZIP without a library:** every file in a real export was deflate-compressed (method 8). Read the ZIP's central directory, which always carries the correct CRC-32 and sizes, rather than the local file headers. In a browser, `DecompressionStream('deflate-raw')` inflates an entry. Browser extension service workers have no `DOMParser`, so the XML was read with regular expressions.

---

## 5. Import

### The call

**Re-confirmed.**

```
POST https://<org>/api/data/v9.2/ImportSolutionAsync
{
  "CustomizationFile": "<base64 zip>",
  "OverwriteUnmanagedCustomizations": true,
  "PublishWorkflows": true,
  "ComponentParameters": [ ...connection bindings, section 6... ]
}
```

The response carries an `AsyncOperationId` and an `ImportJobKey` (the id of its `importjobs` row). Poll `GET asyncoperations(<id>)?$select=statecode,statuscode,message` every 5 seconds: `statecode` 3 means finished, and then `statuscode` 30 is success and 31 is failure (the reason is in `message`).

- **Some orgs refuse async imports.** One test org answered **HTTP 405 "Async operations are currently disabled for this organization"**. Fall back to the synchronous call with the same body plus an `ImportJobId` (a new GUID): `POST ImportSolution`. It returns when the import is done. **Proven.** In the re-test the same org accepted async imports, so the refusal wasn't permanent; keep the fallback. **Untested:** why the org had async disabled (administration mode with background operations off, or a lapsed trial, are the guesses).
- **A synchronous import holds one request open for the whole import:** 197 seconds in one test (**Measured**). In a browser extension that's longer than an idle service worker lives (section 9).
- **`ComponentParameters` works on the async path too** (**Proven**): a reference the async import created came back bound to the connection passed in.
- **The first import creates the solution and its publisher.** Nothing needs to exist on the receiving side. **Re-confirmed**, with the publisher deleted beforehand. **Superseded:** the server build pre-created an empty solution and a publisher before the first import, and its notes record "the first solution create fails, the retry works". Pre-creating a publisher that differs from the one in the ZIP risks a conflict; don't.
- **Detecting a first import:** `ExportSolution` or the solution query on the receiving side finds nothing. An export of a missing solution answers HTTP 404 with `0x80040217`, "The given solution unique name (...) is not valid" (**Re-confirmed**).

### Watching an import job

**Re-confirmed.** `GET importjobs(<id>)`, with the `ImportJobKey` of an async import or the `ImportJobId` you sent with a synchronous one, has `progress`, and its `data` column is XML. The root element says `succeeded="warning"` when any component warned, and each warning or failure is a `<result result="warning">` or `result="failure"` element with an `errorcode` and an `errortext`. That's where per-component errors are, which `asyncoperations` doesn't give you. When checking, be sure you query the org you imported into: an early status script checked the wrong org and reported nothing.

### Errors and retries

- **`SolutionConcurrencyFailure`:** another import is running in that org. Two synchronous imports started together: the second answered **HTTP 429** with `0x80071151`, "Cannot start another [Import] because there is a previous [Import] running at this moment" (**Re-confirmed**). Two async imports started together both queued and succeeded. Wait and retry: 10 seconds and one retry worked (**Proven**; a new `ImportJobId` for the retry on the synchronous path).
- **HTTP 429:** honor `Retry-After` (5 seconds if it's missing), up to 3 times.
- **"The original workflow definition has been deactivated and replaced."** (`0x80045042`) is a warning, not an error. It appeared once per cloud flow on every re-import over an existing copy: with the content unchanged, with it changed, and with the version bumped in `solution.xml`. The import succeeded and the flows stayed on (**Proven**). **Superseded:** an early note said bumping the version avoided the warning; in the re-test it didn't.

### Parameters seen

| Parameter | Used | Notes |
|---|---|---|
| `OverwriteUnmanagedCustomizations` | `true` everywhere | The receiving copy is replaced by the incoming one |
| `PublishWorkflows` | `true` (newest build), `false` (first scripts) | Either way, read flow states afterwards (section 6) |
| `SkipProductUpdateDependencies` | `true` (first scripts) | Not used since; no difference recorded |
| `ConvertToManaged` | `false` (server build) | |
| `HoldingSolution`, `StageAndUpgrade`, `DeleteAndPromote` | never | **Untested**: upgrades of managed solutions aren't covered |

---

## 6. Connection references and turning flows on

**Re-confirmed**, across two tenants: an already-bound reference, a first import into a tenant with a usable connection, and a first import with no connection followed by a retry. A sync in the reverse direction was **Proven** earlier.

### 6.1 Find every reference the solution uses

Read both places. Either one alone misses some:

1. **`customizations.xml`:** `<connectionreference connectionreferencelogicalname="...">` elements. The connector is a **child element**, `<connectorid>/providers/Microsoft.PowerApps/apis/shared_office365</connectorid>`, not an attribute. Reading it as an attribute gives empty connector ids (**Proven**).
2. **Each flow's JSON** (the `JsonFileName` of each `<Workflow>` in `customizations.xml`): `properties.connectionReferences.<key>.connection.connectionReferenceLogicalName`, with the connector name in `.api.name`.

- One solution had 12 references in the XML and 4 more that only appeared inside flow JSON, 16 in all (**Proven**).
- The opposite also happens: a solution can declare a reference that none of its flows use (**Proven**).
- `customizations.xml` also gives each flow's `WorkflowId`, `<Category>` (5 = cloud flow, 6 = desktop flow) and `<StateCode>` (1 = on in the source). Section 6.4 uses these.

### 6.2 Pick a connection for each reference

On the receiving side, list the environment's connections (section 3), keep those with `statuses[0].status` = `Connected`, and match on the connector name. The order of preference that worked:

1. the connection used last time for this reference on this side,
2. a connection created by the signed-in user (`properties.createdBy.userPrincipalName`),
3. any other connected connection for that connector.

**Leave references that are already bound alone.** An import that doesn't mention a reference keeps its existing binding: one reference stayed bound through about 8 imports (**Re-confirmed**). Only bind what's unbound or new. The receiving org also holds system references it uses for itself (for example `msdyn_Dataverse`); only ever touch the solution's own.

**You can't unbind a reference** by PATCHing `connectionid` to `null`: it answers 204 and keeps the binding (**Proven**).

### 6.3 Bind them during the import

Pass the bindings in the import's `ComponentParameters`:

```
"ComponentParameters": [
  {
    "@odata.type": "Microsoft.Dynamics.CRM.connectionreference",
    "connectionreferencelogicalname": "<logical name>",
    "connectorid": "/providers/Microsoft.PowerApps/apis/shared_office365",
    "connectionid": "<connection id, exactly as listed>"
  }
]
```

- This binds a reference that already exists unbound on the receiving side, and a reference the import creates: the new reference came back bound, with `createdon` equal to `modifiedon` (**Re-confirmed**; **Proven** on the synchronous `ImportSolution` and on `ImportSolutionAsync`).
- **Superseded: creating the references before import.** The first scripts failed with **"Failed to find connection references with logical name(s) ..."** and fixed it by creating each reference first, with the exact logical name the solution expects: `POST connectionreferences` with `connectionreferencelogicalname`, `connectionreferencedisplayname`, `connectorid` and optionally `connectionid`. A reference that already existed answered `0x80040237`, which can be treated as done. That worked (**Proven**, 16 of 16 created), but `ComponentParameters` makes it unnecessary.

### 6.4 After the import: bind the rest, then turn flows on

1. Read the references back: `GET connectionreferences?$select=connectionreferenceid,connectionreferencelogicalname,connectionid&$filter=Microsoft.Dynamics.CRM.In(PropertyName='connectionreferencelogicalname',PropertyValues=["<name>",...])`.
2. Bind any that are still unbound: `PATCH connectionreferences(<id>)` with `{ "connectionid": "<connection id>" }`. **Re-confirmed** (14 of 18 in one early run, and in every run since).
3. Read the flows' states: `GET workflows?$select=workflowid,statecode&$filter=Microsoft.Dynamics.CRM.In(PropertyName='workflowid',PropertyValues=[...])`.
4. Turn on each cloud flow that is on in the source (category 5, state 1), is off here, and has all its references bound: `PATCH workflows(<id>)` with `{ "statecode": 1, "statuscode": 2 }`. Turn it off with `{ "statecode": 0, "statuscode": 1 }`.
5. Report anything left: which connectors need a connection, and which flows are waiting for one. Give the user a link to the receiving environment's connections page (`https://make.powerautomate.com/environments/<envId>/connections`) and a way to re-run steps 1 to 4 without importing again.

- With `PublishWorkflows: true`, flows came back on by themselves when all their references were bound, and a flow with no connectors came back on. A flow whose reference had no connection came back off (**Re-confirmed**). Don't assume either: read the state.
- **Turning a flow on can still fail on what the flow points at.** In one early run, of 37 flows moved to another tenant, 2 turned on, 13 were skipped and 22 failed, because they referred to SharePoint sites, mailboxes and AI Builder models that only existed in the source tenant (**Measured**). Moving the solution doesn't move the data or resources its flows use.
- **Known limitation:** a reference bound to a connection that was later deleted still looks bound, so its flow is reported as failing to turn on rather than as needing a connection.
- **`0x80060467`** is the answer to turning on a flow whose reference has no connection yet: HTTP 400, "A connector was imported, however the related connection references need connections created and then any dependent flows can be started." (**Proven**). Create the connection, bind it, and turn the flow on again.

### 6.5 Environment variables

**Proven.** An environment variable's definition travels with the solution. Its value travels only if the value record is itself in the solution (component type 381; the ZIP then has an `environmentvariablevalues.json` next to the definition), and then the import **overwrites** the receiving side's value. A value that isn't in the solution never leaves the source, and the receiving side's own value was **kept** through re-imports.

So for a different value per environment, keep the values out of the solution and set each side's value there (`POST environmentvariablevalues` with `schemaname`, `value` and `"EnvironmentVariableDefinitionId@odata.bind"`, or `PATCH` an existing one).

---

## 7. Desktop flows inside solutions

**Re-confirmed**, inside one tenant: a desktop flow was added to a new solution (`AddSolutionComponent`, `ComponentType: 29`), exported (7.4 KB) and imported. The ZIP holds the flow's JSON under `Workflows/` and its four binaries under `desktopflowbinaries/<id>/` (a `desktopflowbinary.xml` and the file under `data/`). The flow arrived on, with its four binaries.

- **Publish the desktop flow first.** Saving in the Designer writes a draft that Dataverse's `workflow` row doesn't show; only Publish updates it (Deployment KB, section 7).
- An import of a larger solution brought 9 desktop flows and 218 desktop flow binaries across with it. They weren't run.
- **Into another tenant** (**Proven**): the same solution imported, and the flow arrived on with its four binaries. **Untested:** running it there. It also needs a machine or machine group and a desktop flow connection on the receiving side.
- To write a desktop flow straight into an environment without a solution, see the Deployment KB, section 7.

---

## 8. Keeping two copies in sync

### 8.1 Detecting a change

**Re-confirmed.**

Hashing the exported ZIP doesn't work: compression output and timestamps differ on every export, so it always reports a change. Hash the contents instead:

1. For every file in the ZIP's central directory, take `name:crc32:uncompressedSize`.
2. Leave out the files that change on every export: `solution.xml` (its version moves), `[Content_Types].xml`, `customizations.xml` (it carries export timestamps), and everything under `Entities/`. Compare case-insensitively. (In the re-test's unmanaged export, table definitions were inside `customizations.xml`; there was no `Entities/` folder.)
3. Sort the lines, join them, and hash the result (SHA-256 was used).

The same solution exported from two different orgs gave the same hash (**Re-confirmed**). A flow edit on one side moved that side's hash only.

- **Blind spot:** a change made only to tables or columns lives in the excluded files, so it isn't detected (**Re-confirmed**: a column's new description reached `customizations.xml`, and the hash didn't move). The workaround was a manual "push this side" button. **Untested:** a finer filter that strips only the volatile attributes from `customizations.xml`.
- **Superseded:** earlier versions hashed only the flow JSON, then kept a hash per component type. Each build excluded different files, which made their hashes incomparable.

### 8.2 Stop the ping-pong

**Proven.** Dataverse's re-export of a solution you just imported isn't byte-identical to what you imported, so comparing ZIP bytes right after an import always shows a change, and the next run copies it straight back. After every import, **export the receiving side again, hash it, and store that as its baseline**. Only update baselines after an import that succeeded.

With the content hash from 8.1, the receiving side's re-export hashed the same as the package just imported (**Proven**). The re-export is still the safer baseline: it's what the receiving side actually holds.

### 8.3 Deciding the direction

Two rules were built, and both were proven:

**Baselines** (**Proven**). Store each side's hash after every sync. On the next run:

| Situation | Action |
|---|---|
| Neither side's hash moved since its baseline | nothing to do |
| Both sides hash the same | store them as baselines, no import |
| No baselines yet and the sides differ | conflict |
| Only one side moved | copy that side over the other |
| Both moved, differently | conflict |

**Newest wins** (**Proven**: 13 of 13 runs picked the right direction, no ping-pong). When the hashes differ, read the latest `modifiedon` on both sides and copy the newer side over the older.

- **The solution record's `modifiedon` doesn't change when you edit a flow in it.** Take the latest `modifiedon` of the solution record *and* its flows: `GET solutioncomponents?$filter=_solutionid_value eq <solutionid> and componenttype eq 29&$select=objectid`, then the flows' `modifiedon` in one `Microsoft.Dynamics.CRM.In(...)` query (**Re-confirmed**: a flow edit moved the flow's `modifiedon` and left the solution's alone).
- If either time can't be read, or they're equal, don't guess: pause.
- **Superseded:** choosing the direction from stored hashes alone, without both baselines and without timestamps, picked the wrong direction: one side's push advanced the shared baseline, and metadata drift made both sides look changed.

### 8.4 Conflicts

When both sides changed, the build that's described here pauses and lets the user choose a side ("Keep A" / "Keep B"), which then runs as a one-way copy (**Proven**).

**Untested (built, never merged):** "newest wins" for conflicts, with a **safety copy** of the losing side's package saved before it's overwritten, and no import at all if that save fails. Whatever rule you choose, keep the overwritten package: an import replaces unmanaged customizations, and there's no undo.

### 8.5 One run at a time

Two synchronous imports into the same org collide (`SolutionConcurrencyFailure`, section 5). Hold a lock per pair of environments for the whole run, with an expiry so a crashed run can't block it forever (20 minutes was used), and mark any run still "running" at startup as interrupted.

---

## 9. Where the code runs

The same calls were made from PowerShell, from a server, and from a browser extension. Each place had its own trap.

**PowerShell:**
- Windows PowerShell 5.1's `ConvertTo-Json` mangled base64 and quoting; PowerShell 7 or hand-built JSON fixed it.
- A device-code sign-in inside a background job (`Start-Job`) can't prompt, so it hangs.
- `Invoke-WebRequest` needed an explicit `-ContentType 'application/json; charset=utf-8'`.

**A server:**
- Hosting platforms often cap request bodies (around 4.5 MB on the one used), so solution ZIPs were uploaded in 3 MB chunks (**Proven**: a 17 MB ZIP in 6 chunks). Delete the stored chunks once the import is done, or they pile up.
- The server holds every customer's refresh tokens, so encrypt them, and restrict which hosts the server will call with them (only `*.crm<N>.dynamics.com` and the Microsoft endpoints).

**A browser extension, no server** (Chrome MV3):
- **Chrome stops an idle extension service worker after about 30 seconds,** and a synchronous import is one long request with no extension activity. Without a keep-alive the run died as soon as the popup closed. Calling a cheap extension API every 20 seconds kept it alive through a 197-second import (**Proven**).
- A single service worker event is limited to about 5 minutes, so a very large synchronous import can still be cut off. **Untested:** where that limit actually falls for an import.
- Keep tokens in `chrome.storage.session`, not `chrome.storage.local`, so nothing token-like is written to disk.

### Durations

**Measured** on small test solutions unless stated:

| Run | Time |
|---|---|
| 17 MB solution, 43 flows, 274 components, import only | about 2 minutes |
| Same, export + import | 4.2 minutes |
| Small solution, one-way sync through a server | 85 to 250 seconds |
| Cross-tenant sync, small solution | 167 seconds |
| "No changes" check (export both sides, hash, compare) | 15 seconds |
| Synchronous import, small solution, browser extension | 197 seconds |
| Desktop flow solution, export + import, same tenant | 103 seconds (earlier), 34 seconds (re-test) |
| Desktop flow solution, import into another tenant | 43 seconds |
| Small solution (65 KB, 2 cloud flows), async import | 54 to 209 seconds |
| Same, synchronous export | 7 to 33 seconds |

---

## 10. Troubleshooting

| Symptom | Real cause | Fix |
|---|---|---|
| **Empty HTTP 401** from Dataverse | The token was issued for an account in another tenant than the org's | Check that the org is in the signed-in tenant's environment list; sign in with the right account |
| **`AADSTS16000`** on silent sign-in | More than one account is signed in and no `login_hint` was sent | Pass the UPN as `login_hint` |
| **`AADSTS650052`** on the receiving tenant | The tenant has no Dataverse service principal, or the user has no Power Automate license | Create the service principal; assign a license (section 2) |
| **`AADSTS65001`** (consent_required) | No consent for the app in that tenant, or the wrong scope was asked for (Graph instead of the org) | Admin consent; ask for `https://<org>/.default` |
| **HTTP 403 `prvCreateEntity`** on import | The signed-in user lacks the System Administrator role in the receiving environment | Assign the role |
| **`AADSTS9002326`** | Token redeemed from a browser extension's origin | Redeem on a server, or use authorization code with a single-page-app redirect |
| **HTTP 405 "Async operations are currently disabled for this organization"** | The org has background operations off | Use synchronous `ImportSolution` with an `ImportJobId` |
| **"Failed to find connection references with logical name(s) ..."** | The solution's flows use references that don't exist on the receiving side, and the import wasn't told how to bind them | Pass bindings in `ComponentParameters`, or create the references first (section 6.3) |
| **`0x80040237`** when creating a connection reference | It already exists | Treat as done |
| **HTTP 404 `0x80040217`** "The given solution unique name (...) is not valid" exporting from the receiving side | The solution isn't there yet: a first import | Import; the import creates it |
| **HTTP 429 `0x80071151`** "Cannot start another [Import] because there is a previous [Import] running" (`SolutionConcurrencyFailure`) | Another import is running in that org | Wait about 10 seconds and retry |
| **HTTP 429** | Throttling | Honor `Retry-After` |
| **No references bound although connections exist** | Connections were read from a different environment | Filter connections by the receiving environment's id |
| **Empty connector ids** after parsing `customizations.xml` | `connectorid` read as an attribute | It's a child element |
| **Some references never get bound** | They appear only in the flows' JSON | Read every flow's `connectionReferences` too |
| **A flow stays off after import** | A reference is unbound, or bound to a connection that was deleted | Create the connection; bind; turn the flow on (section 6.4) |
| **HTTP 400 `0x80060467`** "A connector was imported, however the related connection references need connections created" when turning a flow on | A reference the flow uses has no connection | Create the connection; bind; turn the flow on |
| **A flow fails to turn on although every reference is bound** | It points at a site, list, mailbox or model that only exists in the source tenant | Point it at resources on the receiving side |
| **Every run finds a change, and the copies swap back and forth** | The baseline was taken from the package you imported, not from a fresh export of the receiving side | Re-export after import and store that hash (section 8.2) |
| **Every export looks changed** | Hashing the ZIP bytes, or including `solution.xml` / `customizations.xml` | Hash contents, excluding the volatile files (section 8.1) |
| **A change to a table isn't detected** | Table changes live in the files excluded from the hash | Push that side manually |
| **The newer side was overwritten** | The direction was taken from stored hashes, or from the solution record's `modifiedon` alone | Use baselines, or the latest `modifiedon` of the solution and its flows (section 8.3) |
| **"The original workflow definition has been deactivated and replaced."** (`0x80045042`) on re-import | Expected: one per cloud flow on every re-import over an existing copy | Nothing; the flows stay on |
| **`0x80048036`** "Managed solutions cannot be exported" | The solution is managed where you tried to export it | Export from the environment that holds it unmanaged |
| **An environment variable value was overwritten by an import** | The value record is in the solution | Keep values out of the solution; set each side's own (section 6.5) |
| **A reference stays bound after PATCHing `connectionid` to null** | Unbinding that way isn't supported | Bind it to the connection you want instead |
| **A long import dies when the extension popup closes** | Chrome stopped the idle service worker | Keep-alive every 20 seconds (section 9) |
