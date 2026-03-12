import { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { theme } from 'lib/styles/theme';

interface Props {
  onFinish: () => void;
}

const SplashScreen = ({ onFinish }: Props) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleAnimationEnd = () => {
    if (fadeOut) onFinish();
  };

  return (
    <Overlay $fadeOut={fadeOut} onAnimationEnd={handleAnimationEnd}>
      <Content>
        <Logo>Lyra</Logo>
        <SubText>Workspace</SubText>
        <Spinner />
      </Content>
    </Overlay>
  );
};

export default SplashScreen;

// ─── Animations ─────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const fadeOutAnim = keyframes`
  from { opacity: 1; }
  to   { opacity: 0; }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// ─── Styled Components ─────────────────────────

const Overlay = styled.div<{ $fadeOut: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.bgPrimary};
  animation: ${({ $fadeOut }) => ($fadeOut ? fadeOutAnim : 'none')} 0.4s ease forwards;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  animation: ${fadeIn} 0.5s ease both;
`;

const Logo = styled.h1`
  margin: 0;
  font-size: 2.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${theme.blue};
`;

const SubText = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: ${theme.textMuted};
`;

const Spinner = styled.div`
  margin-top: 1.5rem;
  width: 20px;
  height: 20px;
  border: 2px solid ${theme.border};
  border-top-color: ${theme.blue};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;
