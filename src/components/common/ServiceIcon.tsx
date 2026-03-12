import React from 'react';
import styled from 'styled-components';
import { getServiceIcon, hasServiceIcon } from 'lib/icons/services';

const IconWrapper = styled.span<{ $size: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  flex-shrink: 0;

  & > svg {
    width: 100%;
    height: 100%;
  }
`;

const WithTextWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
`;

interface ServiceIconProps {
  serviceType: string;
  size?: number;
  alt?: string;
}

const ServiceIcon = ({ serviceType, size = 20 }: ServiceIconProps) => {
  const icon = getServiceIcon(serviceType, size);
  if (!icon) return null;
  return <IconWrapper $size={size}>{icon}</IconWrapper>;
};

export default ServiceIcon;

export const ServiceIconWithText = ({
  serviceType,
  children,
  size = 20,
}: ServiceIconProps & { children: React.ReactNode }) => {
  return (
    <WithTextWrapper>
      {hasServiceIcon(serviceType) && <ServiceIcon serviceType={serviceType} size={size} />}
      {children}
    </WithTextWrapper>
  );
};
