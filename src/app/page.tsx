// src/app/page.tsx
"use client"

import { Provider } from "@/types/ocr";
import Link from "next/link";
import styled from "styled-components";

const Container = styled.div`
  padding: ${({ theme }) => theme.spacing.large};
  font-family: ${({ theme }) => theme.fonts.main};
  background-color: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.heading};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.medium};
`;

const Description = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.subheading};
  color: ${({ theme }) => theme.colors.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.medium};
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  display: flex;
  gap: ${({ theme }) => theme.spacing.medium};
`;

const ListItem = styled.li`
  font-size: ${({ theme }) => theme.fontSizes.body};
`;

const StyledLink = styled(Link)`
  text-decoration: none;
  color: ${({ theme }) => theme.colors.primary};
  padding: ${({ theme }) => theme.spacing.small} ${({ theme }) => theme.spacing.medium};
  border-radius: ${({ theme }) => theme.borderRadius};
  background-color: ${({ theme }) => theme.colors.buttonText};
  box-shadow: ${({ theme }) => theme.boxShadow};
  transition: background-color 0.2s ease, transform 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.linkText};
    background-color: ${({ theme }) => theme.colors.secondary};
    transform: translateY(-2px);
  }
`;

const HomePage: React.FC = () => {
  return (
    <Container>
      <Title>OCR Processor</Title>
      <Description>Select an OCR tool to test:</Description>
      <List>
        <ListItem>
          <StyledLink href={{ pathname: "/ocr", query: { provider: Provider.Tesseract } }}>Tesseract OCR</StyledLink>
        </ListItem>
        <ListItem>
          <StyledLink href={{ pathname: "/ocr", query: { provider: Provider.EasyOCR } }}>EasyOCR (Coming Soon)</StyledLink>
        </ListItem>
      </List>
    </Container>
  );
};

export default HomePage;
