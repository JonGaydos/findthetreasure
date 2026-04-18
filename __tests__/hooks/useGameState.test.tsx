/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGameState } from '@/hooks/useGameState';

beforeEach(() => {
  localStorage.clear();
});

// ─── circleMode default ─────────────────────────────────────────────────

test('new user (no saved preference) → circleMode defaults to off', async () => {
  const { result } = renderHook(() => useGameState());
  await waitFor(() => expect(result.current.hydrated).toBe(true));
  expect(result.current.state.circleMode).toBe('off');
});

// ─── circleMode legacy migration ────────────────────────────────────────

test('legacy ftt_circlesVisible="true" → migrates to circleMode="all"', async () => {
  localStorage.setItem('ftt_circlesVisible', 'true');

  const { result } = renderHook(() => useGameState());
  await waitFor(() => expect(result.current.hydrated).toBe(true));

  expect(result.current.state.circleMode).toBe('all');
  expect(localStorage.getItem('ftt_circleMode')).toBe('all');
  expect(localStorage.getItem('ftt_circlesVisible')).toBeNull();
});

test('legacy ftt_circlesVisible="false" → migrates to circleMode="off"', async () => {
  localStorage.setItem('ftt_circlesVisible', 'false');

  const { result } = renderHook(() => useGameState());
  await waitFor(() => expect(result.current.hydrated).toBe(true));

  expect(result.current.state.circleMode).toBe('off');
  expect(localStorage.getItem('ftt_circleMode')).toBe('off');
  expect(localStorage.getItem('ftt_circlesVisible')).toBeNull();
});

test('new ftt_circleMode key takes precedence over legacy key', async () => {
  localStorage.setItem('ftt_circleMode', 'last');
  localStorage.setItem('ftt_circlesVisible', 'true'); // should be ignored

  const { result } = renderHook(() => useGameState());
  await waitFor(() => expect(result.current.hydrated).toBe(true));

  expect(result.current.state.circleMode).toBe('last');
  // Legacy cleanup still happens even when new key wins
  expect(localStorage.getItem('ftt_circlesVisible')).toBeNull();
});

test('saved ftt_circleMode="last" loads as last', async () => {
  localStorage.setItem('ftt_circleMode', 'last');

  const { result } = renderHook(() => useGameState());
  await waitFor(() => expect(result.current.hydrated).toBe(true));

  expect(result.current.state.circleMode).toBe('last');
});

test('saved ftt_circleMode="all" loads as all', async () => {
  localStorage.setItem('ftt_circleMode', 'all');

  const { result } = renderHook(() => useGameState());
  await waitFor(() => expect(result.current.hydrated).toBe(true));

  expect(result.current.state.circleMode).toBe('all');
});

// ─── circleMode update setter ───────────────────────────────────────────

test('update({ circleMode: "last" }) writes to localStorage', async () => {
  const { result } = renderHook(() => useGameState());
  await waitFor(() => expect(result.current.hydrated).toBe(true));

  act(() => {
    result.current.update({ circleMode: 'last' });
  });

  expect(result.current.state.circleMode).toBe('last');
  expect(localStorage.getItem('ftt_circleMode')).toBe('last');
});

test('update({ circleMode: "off" }) → writes "off" (not removed)', async () => {
  localStorage.setItem('ftt_circleMode', 'all');

  const { result } = renderHook(() => useGameState());
  await waitFor(() => expect(result.current.hydrated).toBe(true));

  act(() => {
    result.current.update({ circleMode: 'off' });
  });

  expect(result.current.state.circleMode).toBe('off');
  expect(localStorage.getItem('ftt_circleMode')).toBe('off');
});

// ─── clearGame removes both new and legacy keys ─────────────────────────

test('clearGame removes ftt_circleMode and ftt_circlesVisible', async () => {
  localStorage.setItem('ftt_circleMode', 'last');
  localStorage.setItem('ftt_circlesVisible', 'true');

  const { result } = renderHook(() => useGameState());
  await waitFor(() => expect(result.current.hydrated).toBe(true));

  act(() => {
    result.current.clearGame();
  });

  expect(localStorage.getItem('ftt_circleMode')).toBeNull();
  expect(localStorage.getItem('ftt_circlesVisible')).toBeNull();
});
