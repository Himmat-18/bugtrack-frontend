import { useEffect, useState } from "react";
import "./App.css";

const API = "/api";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(localStorage.getItem("email") || "");
  const [projects, setProjects] = useState([]);
  const [issues, setIssues] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [message, setMessage] = useState("");

  const [auth, setAuth] = useState({
    fullName: "",
    email: "",
    password: ""
  });

  const [projectForm, setProjectForm] = useState({
    name: "",
    description: ""
  });

  const [issueForm, setIssueForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    status: "TODO",
    projectId: "",
    assignedToId: ""
  });

  const [commentText, setCommentText] = useState("");

  async function request(url, method = "GET", body = null) {
    const response = await fetch(API + url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });

    if (response.status === 204) return null;

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || data.detail || "Something went wrong");
    }

    return data;
  }

  async function handleAuth(e) {
    e.preventDefault();

    try {
      const endpoint = page === "login"
        ? "/auth/login"
        : "/auth/register";

      const body = page === "login"
        ? { email: auth.email, password: auth.password }
        : auth;

      const data = await request(endpoint, "POST", body);

      if (page === "register") {
        setMessage("Registration successful! Please login.");
        setPage("login");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("email", auth.email);

      setToken(data.token);
      setUser(auth.email);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadProjects() {
    try {
      const data = await request("/projects");
      setProjects(data || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadIssues(projectId) {
    try {
      const data = await request(`/issues/project/${projectId}`);
      setIssues(data || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createProject(e) {
    e.preventDefault();

    try {
      await request("/projects", "POST", projectForm);
      setProjectForm({ name: "", description: "" });
      setMessage("Project created successfully!");
      await loadProjects();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createIssue(e) {
    e.preventDefault();

    try {
      const body = {
        ...issueForm,
        projectId: Number(issueForm.projectId),
        assignedToId: issueForm.assignedToId
          ? Number(issueForm.assignedToId)
          : null
      };

      await request("/issues", "POST", body);

      setIssueForm({
        title: "",
        description: "",
        priority: "MEDIUM",
        status: "TODO",
        projectId: selectedProject?.id || "",
        assignedToId: ""
      });

      setMessage("Issue created successfully!");

      if (selectedProject) {
        await loadIssues(selectedProject.id);
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateStatus(issue, status) {
    try {
      await request(`/issues/${issue.id}`, "PUT", {
        title: issue.title,
        description: issue.description,
        status,
        priority: issue.priority,
        projectId: issue.projectId,
        assignedToId: issue.assignedToId
      });

      await loadIssues(issue.projectId);
      setMessage("Issue status updated!");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteIssue(id) {
    if (!window.confirm("Are you sure you want to delete this issue?")) return;

    try {
      await request(`/issues/${id}`, "DELETE");
      await loadIssues(selectedProject.id);
      setSelectedIssue(null);
      setMessage("Issue deleted successfully!");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function openComments(issue) {
  console.log("Selected Issue:", issue);
  console.log("Issue ID:", issue.id);

  setSelectedIssue(issue);
  setPage("comments");

  try {
    const data = await request(`/issues/${issue.id}/comments`);
    setComments(data || []);
  } catch (error) {
    setMessage(error.message);
  }
}

  async function addComment(e) {
  e.preventDefault();

  console.log("Selected Issue in addComment:", selectedIssue);
  console.log("Selected Issue ID:", selectedIssue?.id);

  try {
    const url = `/issues/${selectedIssue.id}/comments`;

    console.log("Comment API URL:", url);

    await request(url, "POST", {
      content: commentText
    });

    setCommentText("");

    const data = await request(url);
    setComments(data || []);

    setMessage("Comment added successfully!");
  } catch (error) {
    console.error("Comment Error:", error);
    setMessage(error.message);
  }
}

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    setToken(null);
    setPage("login");
    setProjects([]);
    setIssues([]);
    setSelectedProject(null);
    setSelectedIssue(null);
  }

  useEffect(() => {
    if (token) {
      loadProjects();
      setPage("dashboard");
    }
  }, [token]);

  useEffect(() => {
  if (projects.length > 0 && !selectedProject) {
    const firstProject = projects[0];

    setSelectedProject(firstProject);

    setIssueForm(previous => ({
      ...previous,
      projectId: firstProject.id
    }));

    loadIssues(firstProject.id);
  }
}, [projects]);

  if (!token) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="brand-icon">B</div>
          <h1>BugTrack</h1>
          <p className="subtitle">Manage projects. Track issues. Build better.</p>

          <div className="auth-tabs">
            <button
              className={page === "login" ? "active" : ""}
              onClick={() => { setPage("login"); setMessage(""); }}
            >
              Login
            </button>
            <button
              className={page === "register" ? "active" : ""}
              onClick={() => { setPage("register"); setMessage(""); }}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuth}>
            {page === "register" && (
              <input
                placeholder="Full Name"
                required
                value={auth.fullName}
                onChange={e => setAuth({ ...auth, fullName: e.target.value })}
              />
            )}

            <input
              type="email"
              placeholder="Email Address"
              required
              value={auth.email}
              onChange={e => setAuth({ ...auth, email: e.target.value })}
            />

            <input
              type="password"
              placeholder="Password"
              required
              value={auth.password}
              onChange={e => setAuth({ ...auth, password: e.target.value })}
            />

            <button className="primary-btn" type="submit">
              {page === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          {message && <p className="message">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon small">B</span>
          <span>BugTrack</span>
        </div>

        <p className="nav-heading">WORKSPACE</p>

        <button
          className={page === "dashboard" ? "nav-item selected" : "nav-item"}
          onClick={() => setPage("dashboard")}
        >
          ▦ Dashboard
        </button>

        <button
          className={page === "projects" ? "nav-item selected" : "nav-item"}
          onClick={() => setPage("projects")}
        >
          ◫ Projects
        </button>

        <button
          className={page === "issues" ? "nav-item selected" : "nav-item"}
          onClick={() => {
            setPage("issues");
            if (selectedProject) loadIssues(selectedProject.id);
          }}
        >
          ◈ Issues
        </button>

        <div className="sidebar-bottom">
          <p className="nav-heading">ACCOUNT</p>
          <div className="user-info">
            <div className="avatar">{user.charAt(0).toUpperCase()}</div>
            <div className="user-email">{user}</div>
          </div>
          <button className="logout-btn" onClick={logout}>↪️ Logout</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h2>
              {page === "dashboard" ? "Dashboard" :
               page === "projects" ? "Projects" :
               page === "comments" ? "Issue Comments" : "Issues"}
            </h2>
            <p>Welcome back! Here's your project overview.</p>
          </div>
          <div className="top-user">{user}</div>
        </header>

        {message && (
          <div className="alert">
            {message}
            <button onClick={() => setMessage("")}>×</button>
          </div>
        )}

        {page === "dashboard" && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <span>Total Projects</span>
                <h2>{projects.length}</h2>
                <small>Your workspace projects</small>
              </div>
              <div className="stat-card">
                <span>Total Issues</span>
                <h2>{issues.length}</h2>
                <small>Selected project issues</small>
              </div>
              <div className="stat-card">
                <span>In Progress</span>
                <h2>{issues.filter(i => i.status === "IN_PROGRESS").length}</h2>
                <small>Currently being worked on</small>
              </div>
              <div className="stat-card">
                <span>Completed</span>
                <h2>{issues.filter(i => i.status === "DONE").length}</h2>
                <small>Finished issues</small>
              </div>
            </div>

            <section className="panel">
              <div className="section-header">
                <div>
                  <h3>Your Projects</h3>
                  <p>Select a project to view its issues.</p>
                </div>
                <button className="primary-btn compact" onClick={() => setPage("projects")}>
                  + New Project
                </button>
              </div>

              <div className="project-grid">
                {projects.map(project => (
                  <div className="project-card" key={project.id}>
                    <div className="project-symbol">P</div>
                    <h3>{project.name}</h3>
                    <p>{project.description}</p>
                    <button
                      className="text-btn"
                      onClick={() => {
                        setSelectedProject(project);
                        setIssueForm({ ...issueForm, projectId: project.id });
                        loadIssues(project.id);
                        setPage("issues");
                      }}
                    >
                      View Issues →
                    </button>
                  </div>
                ))}
                {projects.length === 0 && <p>No projects found. Create your first project.</p>}
              </div>
            </section>
          </>
        )}

        {page === "projects" && (
          <section className="panel">
            <h3>Create New Project</h3>
            <form className="form-grid" onSubmit={createProject}>
              <input
                placeholder="Project Name"
                required
                value={projectForm.name}
                onChange={e => setProjectForm({ ...projectForm, name: e.target.value })}
              />
              <input
                placeholder="Project Description"
                value={projectForm.description}
                onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
              />
              <button className="primary-btn" type="submit">Create Project</button>
            </form>

            <h3 className="list-title">All Projects</h3>
            <div className="project-grid">
              {projects.map(project => (
                <div className="project-card" key={project.id}>
                  <div className="project-symbol">P</div>
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                  <button className="text-btn" onClick={() => {
                    setSelectedProject(project);
                    setIssueForm({ ...issueForm, projectId: project.id });
                    loadIssues(project.id);
                    setPage("issues");
                  }}>
                    Open Project →
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {page === "issues" && (
          <>
            <section className="panel">
              <div className="section-header">
                <div>
                  <h3>{selectedProject?.name || "Select a Project"}</h3>
                  <p>Create and manage project issues.</p>
                </div>
                <select
                  value={selectedProject?.id || ""}
                  onChange={e => {
                    const project = projects.find(p => p.id === Number(e.target.value));
                    setSelectedProject(project || null);
                    if (project) {
                      setIssueForm({ ...issueForm, projectId: project.id });
                      loadIssues(project.id);
                    }
                  }}
                >
                  <option value="">Select Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <form className="form-grid" onSubmit={createIssue}>
                <input
                  placeholder="Issue Title"
                  required
                  value={issueForm.title}
                  onChange={e => setIssueForm({ ...issueForm, title: e.target.value })}
                />
                <input
                  placeholder="Issue Description"
                  value={issueForm.description}
                  onChange={e => setIssueForm({ ...issueForm, description: e.target.value })}
                />
                <select
                  value={issueForm.priority}
                  onChange={e => setIssueForm({ ...issueForm, priority: e.target.value })}
                >
                  <option value="LOW">Low Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="CRITICAL">Critical Priority</option>
                </select>
                <input
                  type="number"
                  placeholder="Assign User ID (optional)"
                  value={issueForm.assignedToId}
                  onChange={e => setIssueForm({ ...issueForm, assignedToId: e.target.value })}
                />
                <button className="primary-btn" type="submit" disabled={!issueForm.projectId}>
                  + Create Issue
                </button>
              </form>
            </section>

            <section className="panel">
              <div className="section-header">
                <div>
                  <h3>Issue Board</h3>
                  <p>Track your work progress.</p>
                </div>
                <button className="secondary-btn" onClick={() => selectedProject && loadIssues(selectedProject.id)}>
                  Refresh
                </button>
              </div>

              <div className="kanban-grid">
                {[
                  { key: "TODO", label: "To Do" },
                  { key: "IN_PROGRESS", label: "In Progress" },
                  { key: "DONE", label: "Done" }
                ].map(column => (
                  <div className="kanban-column" key={column.key}>
                    <h4>{column.label}
                      <span>{issues.filter(i => i.status === column.key).length}</span>
                    </h4>

                    {issues.filter(i => i.status === column.key).map(issue => (
                      <div className="issue-card" key={issue.id}>
                        <span className={`priority ${issue.priority.toLowerCase()}`}>
                          {issue.priority}
                        </span>
                        <h4>{issue.title}</h4>
                        <p>{issue.description}</p>
                        <small>#{issue.id} · {issue.createdByEmail}</small>

                        <select
                          value={issue.status}
                          onChange={e => updateStatus(issue, e.target.value)}
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="DONE">Done</option>
                        </select>

                        <div className="issue-actions">
                          <button onClick={() => openComments(issue)}>Comments</button>
                          <button className="delete-btn" onClick={() => deleteIssue(issue.id)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {page === "comments" && selectedIssue && (
          <section className="panel comments-panel">
            <button className="text-btn" onClick={() => setPage("issues")}>← Back to Issues</button>
            <h3>{selectedIssue.title}</h3>
            <p>{selectedIssue.description}</p>

            <form className="comment-form" onSubmit={addComment}>
              <textarea
                placeholder="Write your comment..."
                required
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
              />
              <button className="primary-btn" type="submit">Post Comment</button>
            </form>

            <h3 className="list-title">Discussion</h3>
            {comments.map(comment => (
              <div className="comment-card" key={comment.id}>
                <div className="avatar">{comment.userName?.charAt(0).toUpperCase()}</div>
                <div>
                  <strong>{comment.userName}</strong>
                  <small>{comment.userEmail} · {new Date(comment.createdAt).toLocaleString()}</small>
                  <p>{comment.content}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && <p>No comments yet.</p>}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;