import { fetchUserProfile, updateUserProfile } from "../../src/services/userProfileApi";

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

describe("userProfileApi", () => {
  const globalAny: { fetch?: jest.Mock } = global;

  beforeEach(() => {
    globalAny.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("uses defaults when profile data is incomplete", async () => {
    globalAny.fetch?.mockResolvedValueOnce(
      createJsonResponse({ id: 1, name: "User" })
    );

    const profile = await fetchUserProfile(1, {
      email: "user@parking.app",
      fullName: "Fallback User",
    });

    expect(profile.fullName).toBe("User");
    expect(profile.email).toBe("user@parking.app");
    expect(profile.defaultZone).toBe("A");
    expect(profile.defaultDurationMin).toBe(60);
    expect(profile.notifyBeforeEnd).toBe(true);
    expect(profile.allowMarketing).toBe(false);
  });

  it("normalizes invalid profile fields", async () => {
    globalAny.fetch?.mockResolvedValueOnce(
      createJsonResponse({
        id: 1,
        fullName: "User",
        email: "user@parking.app",
        defaultZone: "Z",
        defaultDurationMin: "bad",
        notifyBeforeEnd: "yes",
        allowMarketing: null,
      })
    );

    const profile = await fetchUserProfile(1);

    expect(profile.defaultZone).toBe("A");
    expect(profile.defaultDurationMin).toBe(60);
    expect(profile.notifyBeforeEnd).toBe(true);
    expect(profile.allowMarketing).toBe(false);
  });

  it("updates user profile and keeps fallback identity", async () => {
    const payload = {
      fullName: "Jan Nowak",
      email: "jan@parking.app",
      phone: "",
      defaultZone: "B" as const,
      defaultDurationMin: 45,
      notifyBeforeEnd: true,
      allowMarketing: false,
      paymentMethodLabel: "",
    };

    globalAny.fetch?.mockResolvedValueOnce(
      createJsonResponse({
        id: 1,
        defaultZone: "B",
        defaultDurationMin: 45,
      })
    );

    const result = await updateUserProfile(1, payload);

    const [, options] = (globalAny.fetch as jest.Mock).mock.calls[0];
    expect(options.method).toBe("PUT");
    expect(options.body).toContain('"name":"Jan Nowak"');
    expect(result.email).toBe("jan@parking.app");
    expect(result.fullName).toBe("Jan Nowak");
  });

  it("throws when API returns error status", async () => {
    globalAny.fetch?.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Server Error",
      json: async () => ({}),
      text: async () => "Server Error",
    });

    await expect(fetchUserProfile(1)).rejects.toThrow("HTTP 500: Server Error");
  });

  it("uses statusText when error body cannot be read", async () => {
    globalAny.fetch?.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Server Error",
      json: async () => ({}),
      text: async () => {
        throw new Error("fail");
      },
    });

    await expect(fetchUserProfile(1)).rejects.toThrow("HTTP 500: Server Error");
  });
});
