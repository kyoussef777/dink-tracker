/// <reference types="vitest/globals" />
import "@testing-library/jest-dom"

// Mock Pusher server in tests
vi.mock("@/lib/pusher", () => ({
  pusherServer: { trigger: vi.fn().mockResolvedValue(null) },
}))

// Mock Pusher client in tests
vi.mock("@/lib/pusher-client", () => ({
  getPusherClient: vi.fn(() => ({
    subscribe: vi.fn(() => ({ bind: vi.fn(), unbind: vi.fn(), unbind_all: vi.fn() })),
    unsubscribe: vi.fn(),
    connection: { bind: vi.fn(), unbind_all: vi.fn() },
  })),
}))
