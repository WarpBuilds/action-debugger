import * as core from "@actions/core"
import { run } from "./index"

if (!core.getState("deprecationWarned")) {
  core.saveState("deprecationWarned", "true")
  core.warning("Warpbuilds/action-debugger@v1.3 is deprecated. Change it to Warpbuilds/action-debugger@v2.")
}

run()
