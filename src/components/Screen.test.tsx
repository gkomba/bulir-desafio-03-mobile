import React from 'react';
import { Platform, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Screen } from './Screen';

const mockKeyboardAvoiding = jest.fn();
jest.mock('react-native/Libraries/Components/Keyboard/KeyboardAvoidingView', () => ({
  __esModule: true,
  default: (props: { children: React.ReactNode }) => {
    const { View: MockView } = jest.requireActual('react-native');
    mockKeyboardAvoiding(props);
    return <MockView>{props.children}</MockView>;
  },
}));

describe('Screen: o teclado não tapa os campos', () => {
  const original = Platform.OS;
  beforeEach(() => mockKeyboardAvoiding.mockClear());
  afterEach(() => { Platform.OS = original; });

  it.each(['android', 'ios'] as const)('em %s o conteúdo sobe com o teclado (padding)', async (os) => {
    Platform.OS = os;
    await render(<Screen><Text>Formulário</Text></Screen>);
    expect(screen.getByText('Formulário')).toBeOnTheScreen();
    expect(mockKeyboardAvoiding).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'padding' }));
  });
});
