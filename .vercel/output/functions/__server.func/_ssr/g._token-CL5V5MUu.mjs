import { I as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as BootedApp } from "./boot-BFpP81oK.mjs";
import { n as Route } from "./router-CzwqpLY4.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/g._token-CL5V5MUu.js
var import_jsx_runtime = require_jsx_runtime();
function GroupLinkPage() {
	const { token } = Route.useParams();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BootedApp, { pendingGroupToken: token });
}
//#endregion
export { GroupLinkPage as component };
