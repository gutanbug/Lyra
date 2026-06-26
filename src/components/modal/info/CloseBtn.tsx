import styled from 'styled-components'
// lib
import palette from 'lib/styles/palette'
import * as styles from 'lib/styles/styles'

interface CloseBtnProps {
	ModalOff(): void;
}
const CloseBtn = ({ ModalOff }: CloseBtnProps) => {
	return <Content onClick={ModalOff}>Close Modal</Content>
}

const Content = styled.div`
	position: relative;
	width: 180px;
	margin: 5rem auto 0 auto;
	padding: 13px 22px;
	text-align: center;
	font-size: 15px;
	font-weight: 600;
	letter-spacing: -0.01em;
	line-height: 1;
	background-color: ${palette.blue4};
	border: none;
	border-radius: 12px;
	color: #fff;
	cursor: pointer;
	box-shadow: 0 6px 18px rgba(0,123,255,0.32);
	transition: filter .12s ease, transform .12s ease;
	${styles.noselect}

	&:hover {
		filter: brightness(1.07);
		transform: translateY(-1px);
	}

	&:active {
		transform: scale(.98);
	}
`;

export default CloseBtn