export function createGitHub(env = process.env) {
  const token = env.GITHUB_TOKEN;
  const repository = env.GITHUB_REPOSITORY;
  if (!token || !repository) {
    throw new Error("GITHUB_TOKEN and GITHUB_REPOSITORY are required");
  }
  if (repository !== "victoria-ferrazzi/cal.diy") {
    throw new Error("Event repository does not match the fork");
  }

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "cal-diy-harness",
  };

  async function request(pathname, { method = "GET", body, accept } = {}) {
    const response = await fetch(`https://api.github.com${pathname}`, {
      method,
      headers: accept ? { ...headers, Accept: accept } : headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    return { status: response.status, data, text };
  }

  async function api(pathname, options) {
    const { status, data, text } = await request(pathname, options);
    if (status === 404) {
      return null;
    }
    if (status < 200 || status >= 300) {
      throw new Error(`GitHub ${options?.method ?? "GET"} ${pathname} failed (${status}): ${text.slice(0, 400)}`);
    }
    return data;
  }

  return {
    repository,
    token,
    api,
    async canWrite(login) {
      const data = await api(`/repos/${repository}/collaborators/${login}/permission`);
      return ["admin", "maintain", "write"].includes(data?.permission);
    },
    async mainSha() {
      const data = await api(`/repos/${repository}/git/ref/heads/main`);
      return data.object.sha;
    },
    async issue(number) {
      const data = await api(`/repos/${repository}/issues/${number}`);
      return {
        number: data.number,
        title: data.title,
        body: data.body || "",
        labels: data.labels.map((label) => label.name),
      };
    },
    async comment(number, body) {
      return api(`/repos/${repository}/issues/${number}/comments`, {
        method: "POST",
        body: { body },
      });
    },
    async loadState(number) {
      const { status, data, text } = await request(
        `/repos/${repository}/contents/runs/${number}.json?ref=harness-state`
      );
      if (status === 404) {
        return { state: null, sha: null };
      }
      if (status < 200 || status >= 300) {
        throw new Error(`GitHub GET state failed (${status}): ${text.slice(0, 400)}`);
      }
      return {
        state: JSON.parse(Buffer.from(data.content, "base64").toString("utf8")),
        sha: data.sha,
      };
    },
    async ensureStateBranch(baseSha) {
      const existing = await api(`/repos/${repository}/git/ref/heads/harness-state`);
      if (existing) {
        return;
      }
      await api(`/repos/${repository}/git/refs`, {
        method: "POST",
        body: { ref: "refs/heads/harness-state", sha: baseSha },
      });
    },
    async saveState(number, state, expectedSha) {
      const body = {
        message: `harness: issue #${number} ${state.status}`,
        branch: "harness-state",
        content: Buffer.from(`${JSON.stringify(state, null, 2)}\n`).toString("base64"),
      };
      if (expectedSha) {
        body.sha = expectedSha;
      }
      const data = await api(`/repos/${repository}/contents/runs/${number}.json`, {
        method: "PUT",
        body,
      });
      return data.content.sha;
    },
    async openPull({ title, head, body }) {
      return api(`/repos/${repository}/pulls`, {
        method: "POST",
        body: { title, head, base: "main", body },
      });
    },
    async harnessCheck(sha) {
      const data = await api(
        `/repos/${repository}/commits/${sha}/check-runs?check_name=${encodeURIComponent("Harness CI")}&per_page=20`
      );
      const run = (data?.check_runs ?? []).find((item) => item.name === "Harness CI" || item.name.endsWith("/ Harness CI"));
      if (!run) {
        return null;
      }
      const annotations = await api(`/repos/${repository}/check-runs/${run.id}/annotations`);
      return {
        conclusion: run.conclusion,
        url: run.html_url,
        annotations: Array.isArray(annotations) ? annotations.map((item) => item.message).filter(Boolean) : [],
      };
    },
    async pullsForCommit(sha) {
      return (
        (await api(`/repos/${repository}/commits/${sha}/pulls`, {
          accept: "application/vnd.github+json",
        })) ?? []
      );
    },
  };
}
