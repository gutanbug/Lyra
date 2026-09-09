import React, { useContext, useEffect } from 'react'
import styled from 'styled-components'
// modules
import { modalContext } from 'modules/contexts/modal'
import { popModal, deleteModal } from 'modules/actions/modal'
// lib
import zIndex from 'lib/styles/zIndex'
import animations from 'lib/styles/animations'

const Modal = () => {
	const { state: modalState, dispatch } = useContext(modalContext);
	const modalList = modalState.modalList;
	const show = modalList.length !== 0;
	
	const PreventModalOff = (e: React.MouseEvent) => e.stopPropagation();

	const onMouseDown = (id: string) => {
		dispatch(deleteModal(id));
	}

	const ModalList = modalList.map(modal => {
		const Content:any = modal['elem'];
		return <Content key={modal['id']}
										PreventModalOff={PreventModalOff}
										ModalOff={() => onMouseDown(modal['id'])}
										args={modal['args']} />;
	});

	useEffect(() => {
		const target = document.querySelector('body');
		if (show) {
			target && (function(){ target.style.overflow = 'hidden' })();
		} else {
			target && target.removeAttribute('style');
		}
	}, [show]);

	return (
		<>
			{show && <ModalBackground onMouseDown={() => dispatch(popModal())}>
				{ModalList}
			</ModalBackground>}
		</>
	);
}

const ModalBackground = styled.div`
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background-color: rgba(12, 12, 16, 0.5);
	backdrop-filter: blur(2px);
	z-index: ${zIndex.modal};
	animation: ${animations.fadeIn} .2s;
`;

export default Modal