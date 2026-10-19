# PAD Robin Deployment KB

**Version 1.0.** Every status below was checked against PAD 2.73 (2.73.00155.26278).

How to get a Power Automate flow from generated text to a running flow without clicking through the portal. Every claim is marked with how sure it is.

It sits beside the PAD Robin Action KB in this repo (`PAD_Robin_ActionKB.json`, `README.md`). The Action KB answers "what Robin will PAD accept?"; this one answers "how do I deliver it and run it?".

| Mark | Meaning |
|---|---|
| **Re-confirmed** | Proven earlier and re-run on 2026-10-17 with the same result |
| **Proven** | Done end to end and checked, between 2026-02-01 and 2026-10-17 (from October on PAD 2.73, the current build) |
| **Measured** | A one-off result (success rates) from a single test run on 2026-10-17 |
| **Superseded** | Was believed or used, later replaced (the replacement is named) |
| **Failed** | Tried and did not work |
| **Untested** | Believed, but no test is recorded |

## 1. The delivery paths at a glance

| Path | What it delivers | Supported by Microsoft? | A person must... | Status |
|---|---|---|---|---|
| **Paste into the Designer** | Desktop flow (Robin) | Yes, it's how the Designer works | paste and Publish | **Re-confirmed**: the most reliable delivery |
| **Flow API** (`api.flow.microsoft.com`) | Cloud flow | Public but lightly documented | consent to each connection once in a browser | **Re-confirmed** |
| **Dataverse `workflow` table** (category 5) | Cloud flow | Yes, documented | same, plus turn it on | **Proven** |
| **Direct Dataverse write** (`workflow` + `desktopflowbinaries`) | Desktop flow | **No** | nothing | **Re-confirmed**; see section 7 |

Two findings hold across every path:

- **Validate before you deliver.** No write path checks the Robin for you. Something a paste would reject can still be written through the API, and it then fails to open ("Failed to deserialize Flow") and fails to run ("Load failed."). Section 5.
- **Connections need a person once.** A flow created through the API gets no connections of its own, and the user has to create each OAuth connection once, signed in, in a browser. Plan the user experience around that one step. Section 4.

---

## 2. Signing in

**Re-confirmed** (one refresh token redeemed for Graph, Flow and Dataverse tokens, each answer carrying a new refresh token). One device-code sign-in can serve Graph, the Flow API and Dataverse:

1. Start the device code flow with `offline_access` in the scope, so a refresh token comes back.
2. Store the refresh token, encrypted, on the server.
3. Exchange it for an access token per resource when needed, using the refresh-token grant with a different `scope` each time. Save the rotated refresh token each time.

| Resource | Scope |
|---|---|
| Microsoft Graph | `https://graph.microsoft.com/.default offline_access` |
| Flow API | `https://service.flow.microsoft.com/.default offline_access` |
| Dataverse | `https://<org>.crm<N>.dynamics.com/.default offline_access` (the org-specific URL) |

What went wrong along the way:

- **A token the Flow API won't take gives 401** (seen on an app registration without Flow permissions). The scope must be `service.flow.microsoft.com`, on an app registration that has Flow API permissions (`Flows.Manage.All`, `Flows.Read.All`) consented. Clear any cached PowerApps-scoped tokens after switching. *Re-checked:* with a different, first-party sign-in client, a `service.powerapps.com` token was accepted by the Flow API (200). So the deciding factor is the app registration's consent, not the scope string alone.
- **`.default` only grants what's already consented on the app registration.** Discovery found 0 SharePoint sites, with no error, until `Sites.Read.All` was explicitly requested and consented.
- On `invalid_grant` or `interaction_required` during a refresh, throw the stored refresh token away and start a new device code.

**Browser extensions (Chrome MV3).** **Re-confirmed.** After a real sign-in, the same device code was refused with the extension's Origin and accepted without it (with a refresh token). The check only shows once the user has signed in: while the code is still pending, the endpoint answers `authorization_pending` whatever the Origin. an extension can't redeem a device code itself. Azure answers **AADSTS9002326** ("cross-origin token redemption is permitted only for the 'Single-Page Application' client-type") because the request carries a `chrome-extension://` Origin, whatever the app registration's platform settings say. The fix is to run device-code start, poll and refresh on your server, which sends no Origin header. A refresh every 45 minutes keeps the extension's token current.

**Caching.** Cache access tokens per user and scope, encrypted, and never hand out one with less than about 10 minutes left.

---

## 3. Discovery: ground the generator in the user's real environment

Give the model the user's real resources instead of letting it invent them. Models invent operation ids, site URLs and list names, and anything they invent fails at deploy time.

Calls (all **re-confirmed**, `api-version=2016-11-01`; the `apis` call fails with `MissingEnvironmentFilter` without the environment filter):

| What | Request |
|---|---|
| Environments | `GET https://api.powerapps.com/providers/Microsoft.PowerApps/environments` |
| The user's connections | `GET https://api.powerapps.com/providers/Microsoft.PowerApps/connections?$filter=environment eq '<envId>'` |
| A connector's operations | `GET https://api.powerapps.com/providers/Microsoft.PowerApps/apis/shared_<connector>?$filter=environment eq '<envId>'`, then read `properties.swagger.paths` |
| SharePoint sites and lists, Teams and channels, mail folders, Excel files | Microsoft Graph |

Notes:

- **Environment.** Pick the environment that has `properties.linkedEnvironmentMetadata.instanceUrl`; that field is also its Dataverse org URL. The first environment in the list isn't always the right one.
- **Connections.** Keep only connections whose `statuses[0].status` is `Connected`, one per connector. Key them by the connector id, for example `shared_office365`.
- **Operations.** Inject all of a connector's operations, not a shortlist. Resolve `$ref` parameters so the model sees real parameter names.
- **Scope matters.** Filter the connection query by the environment you're deploying to; a connection from another environment can't be bound.

---

## 4. Cloud flows through the Flow API

**Re-confirmed.** The deploy path in production use.

```
POST https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/<envId>/flows?api-version=2016-11-01
Authorization: Bearer <Flow-scoped token>
Content-Type: application/json; charset=utf-8

{
  "properties": {
    "displayName": "Invoice notification",
    "definition": { ...Logic Apps workflow definition... },
    "connectionReferences": {
      "shared_office365": {
        "connectionId": "/providers/Microsoft.PowerApps/apis/shared_office365/connections/<connectionName>",
        "connectionName": "<connectionName>",
        "id": "/providers/Microsoft.PowerApps/apis/shared_office365"
      }
    },
    "state": "Stopped"
  }
}
```

The response's `name` is the new flow's id. The flow lands **Stopped**, which is deliberate: the user reviews it first.

**Turning it on and off (proven):**

```
POST https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/<envId>/flows/<flowId>/start?api-version=2016-11-01
POST .../flows/<flowId>/stop?api-version=2016-11-01
```

Both answer 200 with an empty body, and `properties.state` changes to `Started` or `Stopped`. Starting a flow doesn't run it. It only arms the trigger, so a Recurrence flow runs at its next scheduled time.

- `charset=utf-8` matters. One "400 Bad Request" was only the missing charset on the content type.
- The `definition` is an object here. Through the Power Automate Management connector's "Create Flow" action it had to be wrapped in `json()`; sent as an escaped string, it failed to deserialize. (Not re-tested.)

### Definition rules

The model gets these wrong often enough that it pays to check or fix them in code after generation and before deploy.

**Re-tested against the current Flow API.** One baseline flow (a Recurrence trigger, then Office 365 Users "Get my profile") was deployed, then 24 copies of it, each with exactly one change. That makes 25 deploy attempts. The API accepted 11, created Stopped so nothing ran, and rejected 14.

| Rule | What today's API does otherwise |
|---|---|
| Every connector `host`, **trigger or action**, has `connectionName` = a key of `connectionReferences` (`shared_<x>`), not `connectionReferenceName` | Rejected. With `connectionReferenceName`: "The 'host.connectionReferenceName' property value is of type 'Null'" (`WorkflowRunActionInputsInvalidProperty`, or `WorkflowTriggerInputsPropertyInvalid` on a trigger). The API fills `connectionReferenceName` in itself from `connectionName` |
| That key includes the `shared_` prefix | `connectionName: "office365users"` gives "Property 'host.connectionReferenceName' is missing" (`WorkflowRunActionInputsMissingProperty`) |
| Every connector the flow uses has an entry in `connectionReferences` | Same "Property 'host.connectionReferenceName' is missing" |
| `$connections` and `$authentication` are declared in `definition.parameters` (for a Recurrence trigger, at least) | `InvalidPowerFlow`: "The provided flow definition with a recurrent trigger is missing the required parameter '$authentication'" (or `'$connections'`) |
| `If`, not `Condition`; `Until`, not `Do_Until` | `InvalidRequestContent`: "Invalid JSON at path 'properties.definition.actions.<name>.type'" |
| A polling trigger (`OpenApiConnection`) has a `recurrence` | `TemplateValidationError`: "The 'recurrence' property of template trigger ... is not defined or not valid" |
| A notification trigger (`OpenApiConnectionNotification`) has no `recurrence` | `TemplateValidationError`: "the 'recurrence' property should not be specified for triggers of type 'OpenApiConnectionNotification'" |
| `operationId` exists in the connector | `WorkflowOperationInputsApiOperationNotFound` |
| Only parameters the operation defines | `WorkflowOperationParametersExtraParameter`: "The API operation does not contain a definition for parameter ..." |
| `InitializeVariable` only at the top level | `InvalidVariableInitialization` |

These rules turned out **not** to be needed, at least at deploy time:

| Old rule | Current behaviour |
|---|---|
| `Foreach`, not `ForEach` | `ForEach` is accepted and stored as `Foreach` |
| No `authentication` inside action inputs | Accepted (`@parameters('$authentication')`, as portal exports have it) on an Office 365 Users action, and on a trigger. The earlier rejections were reported for OneDrive and Excel; not re-tested on those |
| No `splitOn` on triggers | `splitOn: @triggerOutputs()?['body/value']` on a batch trigger is accepted and kept. Removing it earlier hid "unsupported split expression" errors whose cause wasn't recorded |
| Never `OpenApiConnectionNotification`; rewrite to `OpenApiConnection` + recurrence | Both forms deploy for Outlook "When a new email arrives (V3)", as long as the recurrence rule above is kept |
| Path-style names, not dotted (`emailMessage.To`) | An expression with dotted property access deploys. The earlier "Expected token 'LeftParenthesis' and actual 'Dot'" error wasn't reproduced; its exact input wasn't recorded |

**Superseded:**

- *"Inject `$authentication` into every action's inputs"* (an early proof of concept). That's allowed, but not required: declaring it in `parameters` is what's required.
- *"Triggers use `host.connectionReferenceName`, actions use `host.connectionName"* (an earlier note). **Disproved:** on this API both use `connectionName`.

### Connections can't be created headlessly

**Re-confirmed.** A connector action with no `connectionReferences` entry is rejected at deploy. An Office 365 connection created through the API (`PUT .../apis/shared_office365/connections/<name>`) exists, but its status is `Error` / `Unauthenticated` until someone signs in to it. A flow created through the API gets no connections of its own: a SharePoint action failed with "Connector not found" until an existing connection was bound in `connectionReferences`. OAuth connections (Office 365, SharePoint and so on) are user-authenticated: the user creates each one once, signed in, at make.powerautomate.com, and the deploy binds it from then on. Discovery (section 3) shows which ones are missing, so ask for those before deploying.

### Repair loop

If the deploy is rejected, send the model the error message, the connection list, the failing definition (cut to about 12,000 characters) and the known-fixes list above, run its answer through the same fixups, and deploy again. Three attempts in total is enough; more rarely helps.

**Measured:** ten long, branching flows were written by hand with these rules, against real resources. They used:

- **Branching:** `If`, `Switch`, `Foreach` (one nested inside another), `Until` with a `Wait`, `Scope` try/catch/finally on run-after, four parallel branches joined into one action, `Query` / `Select` / `Table`, and array and integer variables.
- **Connectors:** two to five per flow, from Outlook, Office 365 Users, SharePoint, OneDrive for Business, Teams and Dataverse.

Every flow sent its result by email or a Teams message, so each run is visible. Results:

- **9 of 10 deployed first time.** The tenth read from a deliberately missing SharePoint list, and the Flow API checks lists at deploy (below).
- **All 10 runs succeeded,** including a try/catch flow whose Try scope failed on purpose and whose Catch scope handled it.
- **Two branches were never exercised** because the data didn't call for them: no high-importance mail, no upcoming calendar events.

So long, branching, multi-connector flows deploy and run when the definition follows the rules in this section and the resources are real. The hard part is getting a model to write them that way every time; a deployed flow still isn't a tested flow, so run it once.

**Starting a cloud flow from code.** A flow with a manual "button" trigger (`"kind": "Button"`) can't be started through `POST .../triggers/manual/run`. It fails with `InvokerConnectionOverrideFailed`, "Failed to parse invoker connections from trigger 'manual' outputs". Use an HTTP request trigger (`"type": "Request", "kind": "Http"`) instead: get its URL with `POST .../flows/<id>/triggers/manual/listCallbackUrl?api-version=2016-11-01`, then POST to that URL. Read the result from `GET .../flows/<id>/runs` and `.../runs/<run>/actions`.

### When things are checked: splitOn, Excel and SharePoint

**Proven.**

- **`splitOn` isn't checked at deploy or at turn-on.** Flows with a `splitOn` on a Recurrence trigger, on a path the output doesn't have, or on an action's output all deployed and started. **They fail every time the trigger fires,** for example "the result of the evaluation of 'splitOn' expression ... is of type 'Null'. The result must be a valid array" (`InvalidTemplate`), or "The template function 'body' is not expected at this location". No run is created, so the flow looks healthy and silently does nothing; only the trigger history shows it. That's what the earlier "unsupported split expression" errors were. `splitOn` belongs only on a batch trigger, pointing at its array: `@triggerOutputs()?['body/value']` for SharePoint "When an item is created".
- **Some parameters are checked against the real resource at deploy.** An Excel "List rows" (`GetItems`) with placeholder file and table ids, and a SharePoint "Get items" on a list that doesn't exist, were both rejected with `DynamicOperationRequestClientFailure`: the API calls the connector's schema operation (`GetTable`) while saving. So Excel and SharePoint actions can only be deployed once their file or list exists.
- **Excel Online (Business) has no triggers at all.** "When a row is added" (`GetOnNewItems_V3`) doesn't exist and is rejected (`WorkflowOperationInputsApiOperationNotFound`); use Recurrence + "List rows". The earlier Excel deploy failure, `InvalidVariableInitialization`, is exactly what an `InitializeVariable` inside a loop or condition gives.

### The other route: the Dataverse `workflow` table

**Proven.** Microsoft's documented way to create a cloud flow is a Dataverse row, not a Flow API call:

```
POST https://<org>.crm<N>.dynamics.com/api/data/v9.2/workflows
Authorization: Bearer <Dataverse-scoped token>

{
  "name": "Invoice notification",
  "category": 5,
  "type": 1,
  "primaryentity": "none",
  "clientdata": "<JSON string, below>"
}
```

with `clientdata`:

```
{
  "properties": {
    "connectionReferences": {
      "shared_office365users": {
        "runtimeSource": "embedded",
        "connection": { "connectionReferenceLogicalName": "<a connectionreference record>" },
        "api": { "name": "shared_office365users" }
      }
    },
    "definition": { ...the same Logic Apps definition as above... }
  },
  "schemaVersion": "1.0.0.0"
}
```

- **Binding.** `connection` can name a connection reference record (`connectionReferenceLogicalName`) or a connection directly (`"name": "<connectionName>"`). Both worked.
- **The flow is created Off** (`statecode 0`, a draft).
- **Turn it on** with `PATCH workflows(<id>) {"statecode": 1, "statuscode": 2}`, and off with `{"statecode": 0, "statuscode": 1}`. On activation the flow gets its runtime resource (`resourceid`). The Flow API then sees the same flow id, as `Started`.
- **Nothing is checked at create.** A definition with an invalid action type was created without complaint. It failed only at turn-on, with a misleading message: `DefinitionRequestMissingFields`, "The definition request is missing required field 'definition'". So check the definition before writing it.

**Which route to use?** The Flow API checks the definition on create, gives specific error messages and needs no Dataverse access. The Dataverse route uses the same token and table as everything else in Dataverse, and works with connection reference records, which is what solutions use.

---

## 5. Desktop flows: validate before you deliver

**Re-confirmed**, from the Console and through the cloud trigger: 17 of 17. Paste-validation predicts API delivery exactly. Seventeen probe scripts were written straight into a test flow through Dataverse and also pasted into the Designer:

- Everything that pasted clean also opened and ran.
- Everything a paste rejected or flagged failed: it would not open ("Can't edit flow: Failed to deserialize Flow.") and would not run. Started from the Console, the run says only "Load failed." in `flowsessions`. Started from the cloud, it gives a code: `RobinScriptParsingError` for scripts a paste drops silently, `RobinPackagerValidationError` for scripts that paste with errors.

So the Designer is the compiler, and the only complete pre-check. A Dataverse write accepts anything; it isn't a validator.

**"Failed to deserialize Flow" is a syntax error, not a serialization problem.** It was first blamed on PAD's serializer ("only equal-length edits survive"), and desktop delivery was shelved because of it. **Overturned:**

- Length-changing edits work.
- PAD's local Designer log names the real error: `ScriptParsingException`, `RobinScriptParsingError`, an ANTLR "Syntax error." with no line or column.
- The failing flows contained `IF %ComputerName% <> '' THEN` and `%...%` inside single-quoted strings, both silent-reject syntax.

### The checks, cheapest first

1. **Static check.** The Action KB's `check-flows.js` catches every silent-reject pattern known (107 of 107 in the probe corpus) plus unknown actions, arguments and enum values, undefined variables and misplaced `ON ERROR`.
2. **Designer paste.** Paste into an empty flow and read the result. This can be automated on a Windows machine with UI Automation:
   - **Launch the Designer from the PAD Console**, not directly. A Designer started on its own crashes (`0xE0434352`): it needs the Console's sign-in and named-pipe context (seen on an older build; not re-tested). Drive the Console's New → Flow → name → Create, then find the Designer window by flow name, not process id.
   - Close the Copilot side panel, focus the canvas (`ProgramItemsListBoxActions`), then Ctrl+A, Delete, Ctrl+V.
   - Read the status bar: "Status: Ready" is clean, "Status: Errors found" has errors. Also read the error list and the action count.
   - **A silent reject looks clean**: the canvas is empty, but the status still says Ready. Require an action count above zero (a false pass came from this; on re-checking, two silent rejects again came back as a clean status with 0 actions).
   - On a clean paste, copy the Designer's own text back (Ctrl+A, Ctrl+C). It's the normalised form of the script.
   - PAD's compile events reach its log files with a delay of a few minutes, so read the UI, not the log.
3. **For flows that will be started from the cloud**, one more rule: put `ON ERROR` only after actions that can raise errors (`error_handling.on_error` in Action KB 3.5.0). The cloud loader rejects the whole flow otherwise.

---

## 6. Desktop flows: paste delivery

**Re-confirmed.** Generate, then validate with the paste check above, repairing once with the Designer's own error messages. Hand the user the validated script and tell them to open an empty flow, press Ctrl+V and Publish. It always works because it's exactly what the Designer accepts. The cost is a manual step.

Remove PAD's file header lines before handing the script over: `@@ConnectionString`, `IMPORT ... AS appmask`, `@SENSITIVE`, `@INPUT`, `@OUTPUT`. A paste that contains them is dropped.


---

## 7. Direct Dataverse writes for desktop flows

> **Unsupported by Microsoft.** This writes a desktop flow's Dataverse rows directly. A PAD update could change any of it, and a wrong write can leave a flow that won't open or run. Everything here was proven on one environment, with attended runs only. Try it in a test environment first, and keep a copy of the flow's `workflow` row and binaries before you write.

A desktop flow is a `workflow` row with `category = 6` plus four `desktopflowbinaries` rows. All of the following was **proven on PAD 2.72 and 2.73, and re-confirmed** (definition writes, a flow created from scratch, and runs from the cloud). The Designer-side details (what Publish and Save draft write) were not re-run.

### Editing an existing flow

PATCH only the `definition`:

```
PATCH <org>/api/data/v9.2/workflows(<flowId>)
If-Match: *
{ "definition": "<the stored form of the Robin>" }
```

- **The stored `definition` is a JSON string literal.** It starts with a `"` and contains `\r\n` escapes. Encode the Robin as a JSON string, then encode that string again as the property value. Read it back and compare.
- Length changes, multi-action scripts and modules that the flow's manifest doesn't list all work. The Console builds its module list from the script, not from the manifest.
- The edited flow opens in the Designer, runs from the Console and runs from a cloud flow. Nothing is published, and opening the flow doesn't rewrite anything.
- **A newer unpublished draft wins in the Designer.** The Designer loads a flow's saved draft if one exists, so publish once before writing through the API. **Don't write while the flow is open in the Designer:** its copy can overwrite yours.

### Creating a flow from scratch

**Re-confirmed** (a child flow created this way ran from the cloud). Copy the shapes from one flow made in the Designer (the template):

1. **POST `workflows`** with:
   - your own `workflowid`, `name`, `category: 6`, `type: 1`, `uiflowtype: 2`, `primaryentity: "none"`, and `schemaversion` from the template;
   - `clientdata`, `metadata`, `inputs` and `outputs` copied from the template, as strings;
   - a **new `saveId`** inside `metadata`, with `clientversion` set to the installed PAD build;
   - `definition` as described above;
   - `dependencies` with an **empty `requiredBinaries`**;
   - `connectionreferences`, `credentials`, `claims` and `desktopflowmodules` set to `"[]"`.

   `uiflowtype`, `schemaversion` and `trustedaccess` only take effect on create; they can't be set later. The workflow comes back already activated (an earlier note said Draft; superseded).
2. **POST four `desktopflowbinaries`**, one each for `flow.manifest` (ManifestFile), `controlRepo.appmask` (ControlRepository), `imageRepo.imgrepo` (ImageRepository) and `flow.dependencies` (DependenciesFile). Each has `name`, `type`, `reference`, `mimetype: application/json` and `"Process@odata.bind": "/workflows(<flowId>)"`.
   - **Capital P.** Lowercase `process@odata.bind` gives "undeclared property", an error seen in early testing.
3. **Upload each binary's contents**: `PATCH desktopflowbinaries(<id>)/data` with `Content-Type: application/octet-stream` and `x-ms-file-name: <Type>_<id>.json`. Stamp the same `saveId` into each.
4. **Then PATCH `dependencies.requiredBinaries`** with the four binary ids. Doing this before the binaries existed was an early failure (`DesktopFlowBinaryNotFoundException`), the one that led to "direct record creation is a dead end". It wasn't a dead end; the steps were in the wrong order.

A flow made this way and never opened in the Designer showed up in the cloud flow's desktop-flow picker after a page reload, and ran from it.

### What the Designer writes, for reference

- **Publish** writes the definition, the metadata and all four binaries in one go, stamping one new `saveId` into all of them, and adds a `componentchangesetversion` row.
- **Save draft** doesn't touch `definition`. The draft goes to `componentchangesetpayloads`, which the REST API refuses ("Restricted API is not called by Microsoft publisher plugin").

### UI elements

**Proven; loading re-confirmed** (UI-element records loaded on the cloud path against a seeded repository).

- `controlRepo.appmask` is plain JSON: screens, each with selectors and controls. Robin refers to an element as `appmask['<screen name>']['<control name>']`. Writing a repository through the API works, including invented placeholder screens.
- Element screenshots are extra binaries (`ControlRepositoryImageFile`, `image/png`) and are *not* listed in `requiredBinaries`. They're optional.
- Keep generated selectors off volatile window titles. A Notepad test failed only because Windows 11 reused a window with a different title.

### Flow inputs and outputs

**Proven** (flows written through the API and run from a cloud flow). The formats were copied from flows made in the Designer.

- **In the Robin header**, after `@SENSITIVE`, one line per variable. Sensitive variables also go in the `@SENSITIVE: [...]` list.

  ```
  @SENSITIVE: []
  @INPUT InText : { 'Description': '', 'FriendlyName': 'InText', 'Type': 'String', 'IsOptional': True, 'DefaultValue': 'hello' }
  @OUTPUT OutText : { 'Description': '', 'FriendlyName': 'OutText', 'Type': 'String' }
  ```

- **In the `inputs` and `outputs` columns**, a JSON schema:

  ```
  {"schema":{"required":[],"properties":{"InText":{"isOptional":true,"default":"hello","description":"","format":null,"title":"InText","type":"string","value":null}},"type":"object"}}
  ```

  Required inputs are also listed in `required`. A sensitive input has `"format": "password"`. A data table output has `"type": "array"`. A flow without inputs or outputs has `{"schema": null}`.
- **Results come back in `flowsessions.outputs`** as JSON, for example `{"OutText":"hello done via parent"}`.
- **`DefaultValue` doesn't apply on a cloud-triggered run.** An input the cloud flow doesn't pass arrives empty, even with a default in both the header and the column. Have the cloud flow pass every input.
- Header lines can't be pasted into the Designer (a paste with them is dropped). Inputs and outputs are made in the Designer's variables pane, or written as above.

> **Don't keep secrets in default values.** A default is stored in plain text in the flow's definition, even for an input marked sensitive. A real flow checked during this research had a password there.

### Child desktop flows

**Proven.** "Run desktop flow" is the action `External.RunFlow`. Child inputs are `@Name: value`; child outputs are `@Name=> Variable`.

```
External.RunFlow FlowId: '<child workflowid>' @ChildIn: $'''hello''' @ChildOut=> ChildOut
```

- **List the child in the parent's `dependencies.childFlows`** (an array of workflow ids). Without it, the run fails with `RunFlowFailedError` "Failed to run flow". With it, a parent and a child both created through the API ran from the cloud: the child's output came back to the parent.
- `External.RunFlow` declares `RunFlowFailedError` and `DesktopFlowTimedOutError`, so it takes `ON ERROR` with those names.

### Cloud connector actions

**Proven.** A desktop flow written through the API called Office 365 Users "Get my profile" through the cloud connector, from a cloud-triggered run. It needs four things; leaving any out fails with the error shown.

1. **The Robin.** One metadata line, then the action:

   ```
   @@connectionDisplayName: '<connection reference display name>'
   External.InvokeCloudConnector Connection: '<padInternalId>' ConnectorId: '/providers/Microsoft.PowerApps/apis/shared_office365users' OperationId: 'MyProfile_V2' @MyProfile_V2Response=> Profile
   ```

   Operation parameters are `@<name>: value` (`@'item/Title': ...` for nested body fields). The output is `@<OperationId>Response=> Variable`.

2. **The `connectionreferences` column.** An array with one entry per connection:

   ```
   [{"api":{"name":"/providers/Microsoft.PowerApps/apis/shared_office365users"},
     "displayName":"<connection reference display name>",
     "connectionReferenceLogicalName":"<existing connectionreference record>",
     "name":"<connection name>", "connectionDisplayName":"...",
     "padInternalId":"<a new GUID, the one in the Robin>",
     "isDisabled":false, "isEmbedded":false, "ownerId":null}]
   ```

   The connection reference record must exist in Dataverse with its connection set.
3. **A `ConnectorDefinition` binary per connector.** `reference` = the connector id, `mimetype: application/json`, listed in `requiredBinaries`. Its contents:

   ```
   {"ConnectorId": "...", "Definition": {"Id": ..., "Name": ..., "Properties": {"IsCustomApi": false, "Swagger": <the connector's swagger>, "Tier": ...}}, "DynamicSchemas": {}, "Locale": "en-CA"}
   ```

   `Id`, `Name`, `Swagger` and `Tier` come from `GET https://api.powerapps.com/providers/Microsoft.PowerApps/apis/<connector>`. Without this binary: `ConnectorOrOperationNotFound`, "Desktop flow contains errors and cannot be run".
4. **The connector flags.** In the `metadata` column, `"containsActiveConnections": true`. In `flow.manifest`, a `ConnectorReferences` entry: `{"ConnectorId": ..., "ConnectorName": "shared_office365users", "IsCustom": false, "Locale": "en-CA"}`. Without them: `ConnectionReferenceError`, "Connection reference '<name> (<padInternalId>)' not found".

#### Operations with dynamic schemas (SharePoint list items and similar)

**Proven** with SharePoint, all calls from a cloud-triggered run. "Get lists" and "Get items" were read-only. "Create item" was aimed at a list that doesn't exist, so nothing was written.

- **Reading needs nothing extra.** "Get items" (`GetItems`) returned every column of the list's items as a custom object, with no schema metadata in the flow: `items={"value":[{"Properties":{"Title":...,"Status":{...}}}]}`.
- **Writing needs the schema declared.** "Create item" (`PostItem`) with a column argument, `@'item/Title': $'''...'''`, was **rejected at load** (`RobinPackagerValidationError`) without metadata. With it, the flow loaded and the call reached SharePoint (here: `ConnectorExecutionError`, "status code 'NotFound'", because the list didn't exist). The metadata is:
  - a line before the action: `@@'InputSchema:item': '<hash>'`;
  - a matching entry in the connector's `ConnectorDefinition` binary:

    ```
    "DynamicSchemas": { "<hash>": {
        "ArgumentName": "item", "IsInput": true, "OperationId": "PostItem", "TypeId": <hash>,
        "Schema": { "type": "object", "properties": {
            "Title": { "title": "Title", "type": "string", "x-ms-property-name-alias": "item/Title" } } } } }
    ```

  The schema is the list's column schema: each property's `x-ms-property-name-alias` is the argument name used in the Robin. The Designer gets it from the connector's metadata operation. **The hash is only a key.** An arbitrary 32-bit number worked, as long as the `@@` line, the `DynamicSchemas` key and `TypeId` agree. The Designer also writes `@@'OutputSchema:<OperationId>Response': '<hash>'` for outputs, which reading didn't need.
- **Operations marked `"x-ms-visibility": "internal"` in the swagger can't be used.** SharePoint "Get sites" (`GetDataSets`) failed with `ConnectorOrOperationNotFound` even with everything else in place. Operations marked `advanced` (`GetTables`) and `important` (`GetItems`) worked.
- **One `ConnectorDefinition` binary per connector.** With two for the same connector, the run failed with `MalformedFlowError`, "Malformed flow detected: ConnectorDefinition".

---

## 8. Running desktop flows

### From a cloud flow

**Re-confirmed.**

- The connector action is `shared_uiflow` / **`RunUIFlow_V2`** with `uiFlowId` = the desktop flow's `workflowid`. It isn't `RunDesktopFlow` with `workflowId`.
- Run mode **Attended**, over a **direct-to-machine connection** (the connection stores the Windows credentials). A two-stage pipeline, generating a desktop flow and then a cloud flow that calls it, ran in 18.9 s.
- **Cloud-triggered runs are stricter than the Console.** The run agent validates the whole flow before it starts and rejects it on any error, with `RobinPackagerValidationError` in classic flows. `ON ERROR` on an action that can't raise errors is the known case: the Console still runs such a flow.
- In a Power Fx flow, every load error is reported as "This flow contains an incompatible PowerFx version" (`PowerFxPackagerValidationError`), even when the versions match. Power Fx flows do run from the cloud. The real error is in PAD's RobinEngine log, event `robin.project.validate.flowcontainserror`.

### From the PAD Console, by link

**Re-confirmed:** the run started from the link and, after Continue was clicked on PAD's prompt, finished `Succeeded`. Start the MSI build's `PAD.Console.Host.exe` with the link as its argument:

```
ms-powerautomate:/console/flow/run?environmentid=<envId>&workflowid=<flowId>&source=Other
```

PAD asks for confirmation each time. Opened as a bare link, it can launch the Store-app copy of PAD and fail with a named-pipe error.

### Watching the run

Read the Dataverse `flowsessions` table:

```
GET <org>/api/data/v9.2/flowsessions?$filter=_regardingobjectid_value eq <flowId>&$orderby=createdon desc&$top=1
Prefer: odata.include-annotations="OData.Community.Display.V1.FormattedValue"
```

Poll until the newest row after your start time leaves `Running`, `InProgress`, `NotStarted`, `Queued` or `Waiting`. Then read `statuscode`, `errorcode`, `errormessage` and `errordetails`. `rundetails` holds only machine information.

### Logs

PAD's logs are in `C:\ProgramData\Microsoft\Power Automate\Logs`: one JSON event per line, kept about two days, readable only from an elevated shell. `%LOCALAPPDATA%\...\DataCollection` belongs to the Store-app copy. Every Designer open logs a harmless `flow.compile.failure` with two `ImportStatement` / `UndefinedError` entries; ignore them.

---

## 9. Troubleshooting

| Symptom | Real cause | Fix |
|---|---|---|
| **"Can't edit flow: Failed to deserialize Flow."** | The stored Robin doesn't parse | Check the script with `check-flows.js` and a paste; write the fixed script |
| **"Load failed."** in `flowsessions` (no code; Console runs) | Same: Robin a paste would reject or flag | Same |
| **`RobinScriptParsingError`** (cloud runs) | Robin a paste drops silently | Same |
| **`RobinPackagerValidationError`** on a cloud-triggered run only | A load-time error the Console tolerates, for example `ON ERROR` on an action that can't raise errors | Follow Action KB `error_handling` |
| **"This flow contains an incompatible PowerFx version"** | Any load error in a Power Fx flow | Read `robin.project.validate.flowcontainserror` in the RobinEngine log |
| **`DesktopFlowBinaryNotFoundException`** | `requiredBinaries` was set before the binaries existed | Create the binaries first, then PATCH `requiredBinaries` |
| **"undeclared property"** on a binary POST | `process@odata.bind` written in lowercase | Use `Process@odata.bind` |
| **Paste reports clean, but nothing landed** | A silent reject: the canvas is empty and the status still says Ready | Require an action count above 0 |
| **The Designer crashes on launch (`0xE0434352`)** | It was started outside the Console | Spawn it from the Console |
| **The API write doesn't show in the Designer** | The flow has a newer unpublished draft, or was open during the write | Publish once; close the Designer before writing |
| **The new flow isn't in the cloud flow's picker** | The picker list is stale | Reload the page |
| **401 on the Flow API** | Token scoped to PowerApps, or no Flow permission consented | `service.flow.microsoft.com/.default` on a registration with Flow consent |
| **AADSTS9002326** from a browser extension | Token redeemed from a `chrome-extension://` origin | Redeem on the server |
| **`RunFlowFailedError`** "Failed to run flow" (a desktop flow with `External.RunFlow`) | The child isn't listed in the parent's `dependencies.childFlows` | List it |
| **`ConnectorOrOperationNotFound`** "Desktop flow contains errors and cannot be run" | A connector action without its `ConnectorDefinition` binary | Add the binary and list it in `requiredBinaries` (section 7) |
| **`ConnectionReferenceError`** "Connection reference '<name> (<id>)' not found" | Connector flags missing: `containsActiveConnections`, manifest `ConnectorReferences` | Set both (section 7) |
| **`ConnectorOrOperationNotFound`** although the `ConnectorDefinition` binary is there | The operation is `internal` in the connector's swagger | Use an operation marked `important` or `advanced` |
| **`RobinPackagerValidationError`** on a connector action with column arguments (`@'item/Title'`) | The dynamic input schema isn't declared | Add the `@@'InputSchema:<arg>'` line and its `DynamicSchemas` entry (section 7) |
| **`MalformedFlowError`** "Malformed flow detected: ConnectorDefinition" | Two `ConnectorDefinition` binaries for the same connector | Keep one per connector |
| **`ConnectorExecutionError`** | The connector call itself failed (the message carries the service's status, for example 'NotFound') | Check the connector inputs; it takes `ON ERROR` |
| **A desktop flow input is empty on a cloud run** | Default values don't apply when the cloud flow doesn't pass the input | Pass every input from the cloud flow |
| **`DefinitionRequestMissingFields`** when turning on a cloud flow created in Dataverse | The definition is invalid; this route checks it only at activation, and the message is misleading | Check the definition before writing it |
| **"400 InvalidPowerFlow ... missing the required parameter '$authentication'"** (or `'$connections'`) | Not declared in `definition.parameters` | Declare both |
| **"The 'host.connectionReferenceName' property value is of type 'Null'"** | The host has `connectionReferenceName` instead of `connectionName` (triggers too) | Use `connectionName` = the `connectionReferences` key |
| **"Property 'host.connectionReferenceName' is missing"** | `connectionName` doesn't match a `connectionReferences` key (no `shared_` prefix, or no entry) | Add the entry; use the `shared_<x>` key |
| **"Connector not found"** | No connection bound | Map it in `connectionReferences`; the user creates the connection once |
| **`DynamicOperationRequestClientFailure`** at deploy (Excel, SharePoint) | The file, table or list in the parameters doesn't exist; the API checks it while saving | Point at a real resource (from discovery) |
| **A flow that is On but never runs; trigger history shows `InvalidTemplate` about `splitOn`** | `splitOn` doesn't evaluate to an array; nothing checks it before the trigger fires | Use `splitOn` only on a batch trigger's array (`@triggerOutputs()?['body/value']`), or remove it |
| **`InvokerConnectionOverrideFailed`** when starting a flow through `/triggers/manual/run` | The flow has a button (`kind: Button`) trigger | Use an HTTP request trigger and POST to its `listCallbackUrl` |
| **`WorkflowOperationParametersExtraParameter`** | A parameter the operation doesn't define | Keep only parameters from the connector's swagger |
