/**
 * Snackbar / Toast — Lyra Design System
 * - SUCCESS: dark bg (#1c1b1a) + 좌측 success dot + 흰 메시지
 * - ERROR:   soft red bg (#fcebec) + 좌측 danger dot + dark 메시지
 * - WARNING: soft orange bg (#fff5e6) + warning dot + warning ink 메시지
 * - INFO:    soft blue bg (#e6f2ff) + accent dot + accent strong 메시지
 */
import styled, { css } from 'styled-components';
import { theme } from 'lib/styles/theme';
import media from 'lib/styles/media';
import animations from 'lib/styles/animations';
import * as styles from 'lib/styles/styles';
import { SnackbarType } from 'types/modules/snackbar';

interface SnackbarProps {
	onClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>): void;
	text: string;
	type: SnackbarType;
}

const ICON_BY_TYPE: Record<SnackbarType, string> = {
	SUCCESS: '✓',
	WARNING: '!',
	ERROR: '!',
	INFO: 'i',
};

const Snackbar = ({ onClick, text, type }: SnackbarProps) => {
	return (
		<Container onClick={onClick} $variant={type}>
			<Dot $variant={type}>{ICON_BY_TYPE[type] ?? 'i'}</Dot>
			<Message $variant={type}>{text}</Message>
		</Container>
	);
};

// ── variant 토큰 맵 ───────────────────────────────────────

const variantStyle = (variant: SnackbarType) => {
	switch (variant) {
		case 'SUCCESS':
			return css`
				background: ${theme.color.gray8};
				color: #fff;
				border: 1px solid ${theme.color.gray8};
			`;
		case 'ERROR':
			return css`
				background: ${theme.color.dangerSoft};
				color: ${theme.color.dangerInk};
				border: 1px solid #f6cdd1;
			`;
		case 'WARNING':
			return css`
				background: ${theme.color.warningSoft};
				color: ${theme.color.warningInk};
				border: 1px solid #ffe5bf;
			`;
		case 'INFO':
		default:
			return css`
				background: ${theme.color.accentSoft};
				color: ${theme.color.accentStrong};
				border: 1px solid #bfdeff;
			`;
	}
};

const dotStyle = (variant: SnackbarType) => {
	switch (variant) {
		case 'SUCCESS': return css`background: ${theme.color.success};`;
		case 'ERROR':   return css`background: ${theme.color.danger};`;
		case 'WARNING': return css`background: ${theme.color.warning};`;
		case 'INFO':
		default:        return css`background: ${theme.color.accent};`;
	}
};

const messageStyle = (variant: SnackbarType) => {
	if (variant === 'SUCCESS') return css`color: #fff;`;
	if (variant === 'ERROR')   return css`color: ${theme.color.dangerInk};`;
	if (variant === 'WARNING') return css`color: ${theme.color.warningInk};`;
	return css`color: ${theme.color.accentStrong};`;
};

const Container = styled.div<{ $variant: SnackbarType }>`
	position: relative;
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 280px;
	max-width: 420px;
	padding: 14px 18px;
	border-radius: 14px;
	box-shadow: ${theme.shadow.toast};
	cursor: pointer;
	animation: ${animations.fadeInBottom} .4s cubic-bezier(0.25,0.1,0.25,1),
						 ${animations.fadeOutBottom} .5s cubic-bezier(0.25,0.1,0.25,1) 3.6s;
	transition: transform ${theme.motion.fast};
	${styles.noselect};
	${({ $variant }) => variantStyle($variant)};

	&:active { transform: scale(0.97); }

	${media.small} {
		width: 100%;
		min-width: 0;
		border-radius: 12px;
	}
`;

const Dot = styled.span<{ $variant: SnackbarType }>`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 22px;
	height: 22px;
	border-radius: 50%;
	color: #fff;
	font-size: 13px;
	font-weight: 800;
	line-height: 1;
	flex-shrink: 0;
	${({ $variant }) => dotStyle($variant)};
`;

const Message = styled.div<{ $variant: SnackbarType }>`
	flex: 1;
	font-family: ${theme.font.body};
	font-size: 14px;
	font-weight: 500;
	line-height: 1.4;
	letter-spacing: -0.01em;
	white-space: pre-wrap;
	word-break: keep-all;
	${({ $variant }) => messageStyle($variant)};
`;

export default Snackbar;
