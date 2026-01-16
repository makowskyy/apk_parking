import { login, register } from "../../src/services/authApi";

type MockResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

const createJsonResponse = (data: unknown, ok = true): MockResponse => ({
  ok,
  status: ok ? 200 : 500,
  statusText: ok ? "OK" : "Error",
  json: async () => data,
  text: async () => JSON.stringify(data),
});

describe("authApi", () => {
  const globalAny: { fetch?: jest.Mock } = global;

  beforeEach(() => {
    globalAny.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("logs in with valid credentials", async () => {
    const user = { id: 1, email: "demo@parking.app", password: "demo123", name: "Demo" };

    globalAny.fetch
      ?.mockResolvedValueOnce(createJsonResponse([user]))
      .mockResolvedValueOnce(createJsonResponse({ id: 1 }));

    const result = await login(user.email, user.password);

    expect(result.user).toEqual({ id: 1, email: user.email, name: user.name });
    expect(result.token).toMatch(/^session-1-/);
    expect(globalAny.fetch).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid credentials", async () => {
    globalAny.fetch?.mockResolvedValueOnce(createJsonResponse([]));

    await expect(login("wrong@parking.app", "bad"))
      .rejects
      .toThrow("Niepoprawny e-mail lub haslo.");

    expect(globalAny.fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects registration when email already exists", async () => {
    const existing = { id: 2, email: "taken@parking.app", password: "pass", name: "Taken" };

    globalAny.fetch?.mockResolvedValueOnce(createJsonResponse([existing]));

    await expect(register("User", existing.email, "secret"))
      .rejects
      .toThrow("Uzytkownik z tym e-mailem juz istnieje.");

    expect(globalAny.fetch).toHaveBeenCalledTimes(1);
  });

  it("registers a new user", async () => {
    const newUser = { id: 5, email: "new@parking.app", name: "New User" };

    globalAny.fetch
      ?.mockResolvedValueOnce(createJsonResponse([]))
      .mockResolvedValueOnce(createJsonResponse({ ...newUser, password: "x" }));

    const result = await register("New User", newUser.email, "secret");

    expect(result.user).toEqual(newUser);
    expect(globalAny.fetch).toHaveBeenCalledTimes(2);
  });

  it("returns session even when session persistence fails", async () => {
    const user = { id: 2, email: "demo2@parking.app", password: "demo", name: "Demo2" };

    globalAny.fetch
      ?.mockResolvedValueOnce(createJsonResponse([user]))
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Server Error",
        json: async () => ({}),
        text: async () => "Server Error",
      });

    const result = await login(user.email, user.password);

    expect(result.user).toEqual({ id: 2, email: user.email, name: user.name });
    expect(result.token).toMatch(/^session-2-/);
    expect(globalAny.fetch).toHaveBeenCalledTimes(2);
  });

  it("bubbles up HTTP errors from the API", async () => {
    globalAny.fetch?.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Server Error",
      json: async () => ({}),
      text: async () => "Server Error",
    });

    await expect(login("user@parking.app", "secret"))
      .rejects
      .toThrow("HTTP 500: Server Error");
  });

  it("uses statusText when error body cannot be read", async () => {
    globalAny.fetch?.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: async () => ({}),
      text: async () => {
        throw new Error("read error");
      },
    });

    await expect(login("user@parking.app", "secret"))
      .rejects
      .toThrow("HTTP 503: Service Unavailable");
  });
});
