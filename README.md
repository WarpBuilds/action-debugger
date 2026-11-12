# Action-Debugger by [WarpBuild](https://warpbuild.com)

[![GitHub Marketplace](https://img.shields.io/badge/GitHub-Marketplace-green)](<[https://github.com/marketplace/actions/action-debugger](https://github.com/marketplace/actions/actiondebugger-by-warpbuild)>)

This GitHub Action offers you a direct way to interact with the host system on which the actual scripts (Actions) will run.

## Features

- Debug your GitHub Actions by using SSH or Web shell
- Continue your Workflows afterwards

## Supported Operating Systems

- Linux
- macOS
- Windows

## Getting Started

By using this minimal example an interactive ssh session will be created.

```yaml
name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup ssh session
        uses: Warpbuilds/action-debugger@v2
```

To get the connection string, just open the `Checks` tab in your Pull Request or Run and scroll to the bottom. There you can connect either directly per SSH or via a web based terminal. The connection string is also logged inside workflow logs.

![screenshots](https://github.com/WarpBuilds/action-debugger/assets/9110203/2e1ce772-285f-4a4e-a41a-d12054d8960e)
![check](https://github.com/WarpBuilds/action-debugger/assets/9110203/d8cb31ef-5044-4f39-a391-a198ec09ce39)


## Manually triggered debug

Instead of having to add/remove, or uncomment the required config and push commits each time you want to run your workflow with debug, you can make the debug step conditional on an optional parameter that you provide through a [`workflow_dispatch`](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#workflow_dispatch) "manual event".

Add the following to the `on` events of your workflow:

```yaml
on:
  workflow_dispatch:
    inputs:
      debug_enabled:
        type: boolean
        required: false
        default: false
```

Then add an [`if`](https://docs.github.com/en/actions/reference/context-and-expression-syntax-for-github-actions) condition to the debug step:

<!--
{% raw %}
-->

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # Enable ssh debugging of manually-triggered workflows if the input option was provided
      - name: Setup interactive ssh session
        uses: Warpbuilds/action-debugger@v2
        if: ${{ github.event_name == 'workflow_dispatch' && inputs.debug_enabled }}
```

<!--
{% endraw %}
-->

You can then [manually run a workflow](https://docs.github.com/en/actions/managing-workflow-runs/manually-running-a-workflow) on the desired branch and set `debug_enabled` to true to get a debug session.

## Detached mode

By default, this Action starts a `ssh` session and waits for the session to be done (typically by way of a user connecting and exiting the shell after debugging). In detached mode, this Action will start the `ssh` session, print the connection details, and continue with the next step(s) of the workflow's job. At the end of the job, the Action will wait for the session to exit.

```yaml
name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup interactive ssh session
        uses: Warpbuilds/action-debugger@v2
        with:
          detached: true
```

By default, this mode will wait at the end of the job for a user to connect and then to terminate the ssh session. If no user has connected within 10 minutes after the post-job step started, it will terminate the `ssh` session and quit gracefully.

## Timeout

By default the ssh session will remain open until the workflow times out. You can [specify your own timeout](https://docs.github.com/en/free-pro-team@latest/actions/reference/workflow-syntax-for-github-actions#jobsjob_idstepstimeout-minutes) in minutes if you wish to reduce GitHub Actions usage.

```yaml
name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup interactive ssh session
        uses: Warpbuilds/action-debugger@v2
        timeout-minutes: 15
```

## Only on failure

By default a failed step will cause all following steps to be skipped. You can specify that the ssh session only starts if a previous step [failed](https://docs.github.com/en/actions/learn-github-actions/expressions#failure).

```yaml
name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup interactive ssh session
        if: ${{ failure() }}
        uses: Warpbuilds/action-debugger@v2
```

## Who can connect

Only the user who started the workflow can connect, using the [public SSH keys on their GitHub account](https://github.com/settings/keys). If they have no key, the step fails.

To let anyone with the session address connect, set `limit-access-to-actor` to `false`:

```yaml
name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup interactive ssh session
        uses: Warpbuilds/action-debugger@v2
        with:
          limit-access-to-actor: false
```

If the registered public SSH key is not your default private SSH key, you will need to specify the path manually, like so: `ssh -i <path-to-key> <ssh-connection-string>`.

## Continue a workflow

If you want to continue a workflow and you are inside an ssh session, just create a empty file with the name `continue` either in the root directory or in the project directory by running `touch continue` or `sudo touch /continue`.

## Attribution

This action is built on top of the great work done by [tmate](https://github.com/mxschmitt/action-tmate)
