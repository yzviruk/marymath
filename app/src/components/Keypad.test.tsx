import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Keypad } from './Keypad';

describe('Keypad', () => {
  it('reports taps on digits, erase and reset', async () => {
    const onDigit = vi.fn();
    const onErase = vi.fn();
    const onReset = vi.fn();
    render(<Keypad onDigit={onDigit} onErase={onErase} onReset={onReset} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '7' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: 'Стерти' }));
    await user.click(screen.getByRole('button', { name: 'Почати приклад знову' }));
    expect(onDigit.mock.calls).toEqual([[7], [0]]);
    expect(onErase).toHaveBeenCalledOnce();
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('accepts a physical keyboard', () => {
    const onDigit = vi.fn();
    const onErase = vi.fn();
    render(<Keypad onDigit={onDigit} onErase={onErase} />);
    fireEvent.keyDown(window, { key: '4' });
    fireEvent.keyDown(window, { key: 'Backspace' });
    fireEvent.keyDown(window, { key: 'a' });
    expect(onDigit).toHaveBeenCalledWith(4);
    expect(onErase).toHaveBeenCalledOnce();
  });

  it('ignores input when disabled', async () => {
    const onDigit = vi.fn();
    render(<Keypad onDigit={onDigit} onErase={() => {}} disabled />);
    fireEvent.keyDown(window, { key: '4' });
    await userEvent.setup().click(screen.getByRole('button', { name: '5' }));
    expect(onDigit).not.toHaveBeenCalled();
  });
});
