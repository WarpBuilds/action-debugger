// @ts-check
import { spawn } from "child_process";
import * as core from "@actions/core";
import * as github from "@actions/github";
import fs from "fs";
import os from "os";

/**
 * @returns {boolean}
 */
export const useSudoPrefix = () => {
  const input = core.getInput("sudo");
  return input === "auto" ? os.userInfo().uid !== 0 : input === "true";
};

/**
 * @param {string} cmd
 * @param {{quiet: boolean} | undefined} [options]
 * @returns {Promise<string>}
 */
export const execShellCommand = (cmd, options) => {
  core.debug(`Executing shell command: [${cmd}]`);
  return new Promise((resolve, reject) => {
    const proc = process.platform !== "win32" ?
      spawn(cmd, [], {
        shell: true,
        env: {
          ...process.env,
          HOMEBREW_GITHUB_API_TOKEN: core.getInput('github-token') || undefined
        }
      }) :
      spawn(`${core.getInput("msys2-location") || "C:\\msys64"}\\usr\\bin\\bash.exe`, ["-lc", cmd], {
        env: {
          ...process.env,
          "MSYS2_PATH_TYPE": "inherit", /* Inherit previous path */
          "CHERE_INVOKING": "1", /* do not `cd` to home */
          "MSYSTEM": "MINGW64", /* include the MINGW programs in C:/msys64/mingw64/bin/ */
        }
      })
    let stdout = ""
    proc.stdout.on('data', (data) => {
      if (!options || !options.quiet) process.stdout.write(data);
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      process.stderr.write(data);
    });

    proc.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(code ? code.toString() : undefined));
      }
      resolve(stdout.trim());
    });
  });
};

/**
 * @param {string} key
 * @param {RegExp} re regex to use for validation
 * @return {string} {undefined} or throws an error if input doesn't match regex
 */
export const getValidatedInput = (key, re) => {
  const value = core.getInput(key);
  if (value !== undefined && !re.test(value)) {
    throw new Error(`Invalid value for '${key}': '${value}'`);
  }
  return value;
};

/**
 * @return {Promise<string>}
 */
export const getLinuxDistro = async () => {
  try {
    const osRelease = await fs.promises.readFile("/etc/os-release");
    const match = osRelease.toString().match(/^ID="?(.*?)"?$/m);
    return match ? match[1] : "(unknown)";
  } catch (e) {
    return "(unknown)";
  }
};

// Ref: https://github.com/LouisBrunner/checks-action/

const prEvents = [
  "pull_request",
  "pull_request_review",
  "pull_request_review_comment",
  "pull_request_target",
];

export const getSHA = (inputSHA) => {
  let sha = github.context.sha;
  if (prEvents.includes(github.context.eventName)) {
    const pull = github.context.payload.pull_request;
    if (pull?.head.sha) {
      sha = pull?.head.sha;
    }
  }
  if (inputSHA) {
    sha = inputSHA;
  }
  return sha;
};

const formatDate = () => {
  return new Date().toISOString();
};

const unpackInputs = (title, inputs) => {
  let output;
  if (inputs.output) {
    output = {
      title: inputs.output.title ?? title,
      summary: inputs.output.summary,
      text: inputs.output.text_description,
      actions: inputs.actions,
      annotations: inputs.annotations,
      images: inputs.images,
    };
  }

  let details_url;

  if (inputs.conclusion === "action_required" || inputs.actions) {
    if (inputs.detailsURL) {
      const reasonList = [];
      if (inputs.conclusion === "action_required") {
        reasonList.push(`'conclusion' is 'action_required'`);
      }
      if (inputs.actions) {
        reasonList.push(`'actions' was provided`);
      }
      const reasons = reasonList.join(" and ");
      core.info(
        `'details_url' was ignored in favor of 'action_url' because ${reasons} (see documentation for details)`
      );
    }
    details_url = inputs.actionURL;
  } else if (inputs.detailsURL) {
    details_url = inputs.detailsURL;
  }

  return {
    status: inputs.status.toString(),
    output,
    actions: inputs.actions,
    conclusion: inputs.conclusion ? inputs.conclusion.toString() : undefined,
    completed_at: inputs.status === "completed" ? formatDate() : undefined,
    details_url,
  };
};

export const createRun = async (octokit, name, sha, ownership, inputs) => {
  try {
    const { data } = await octokit.rest.checks.create({
      ...ownership,
      head_sha: sha,
      name: name,
      started_at: formatDate(),
      ...unpackInputs(name, inputs),
    });
    return data.id;
  } catch (error) {
    core.error(error);
    // Do not fail the action if check creation fails
    return "";
  }
};

export const updateRun = async (octokit, id, ownership, inputs) => {
  try {
    const previous = await octokit.rest.checks.get({
      ...ownership,
      check_run_id: id,
    });
    await octokit.rest.checks.update({
      ...ownership,
      check_run_id: id,
      ...unpackInputs(previous.data.name, inputs),
    });
  } catch (error) {
    core.error(error);
    // Do not fail the action if check update fails
  }
};
