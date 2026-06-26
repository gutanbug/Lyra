import { useContext } from 'react'
import styled from 'styled-components'
// components
import Snackbar from 'components/common/Snackbar'
// lib
import zIndex from 'lib/styles/zIndex'
import media from 'lib/styles/media'
// module
import { snackbarContext } from 'modules/contexts/snackbar'
import { deleteSnackbar } from 'modules/actions/snackbar'

const SnackbarWrapper = ()=> {
	const { 
		state: snackbarState, 
		dispatch: snackbarDispatch 
	} = useContext(snackbarContext);
	
	const onClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		snackbarDispatch(deleteSnackbar());
	}

	return (
		<Container>
			{snackbarState.text !== '' && <Snackbar onClick={onClick} 
																							text={snackbarState.text} 
																							type={snackbarState.type} />}
		</Container>
	);
}

const Container = styled.div`
	position: fixed;
	top: 32px;
	right: 32px;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 10px;
	z-index: ${zIndex.snackbar};
	pointer-events: none;

	& > * { pointer-events: auto; }

	${media.small} {
		top: initial;
		bottom: 16px;
		left: 16px;
		right: 16px;
		align-items: stretch;
	}
`;

export default SnackbarWrapper