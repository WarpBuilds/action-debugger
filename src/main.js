import * as core from "@actions/core"

if (!core.getState("deprecationShown")) {
  core.saveState("deprecationShown", "true")
  core.setFailed("Warpbuilds/action-debugger@v1.3 is deprecated and no longer works. Change it to Warpbuilds/action-debugger@v2. v2 needs an SSH key on your GitHub account: https://github.com/settings/keys")
}
