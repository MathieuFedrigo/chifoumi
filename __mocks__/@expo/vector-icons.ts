import React from "react";
import { Text } from "react-native";

interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

export const MaterialIcons = ({ name, size, color }: IconProps) => {
  return React.createElement(Text, { style: { fontSize: size, color } }, name);
};

export const Ionicons = ({ name, size, color }: IconProps) => {
  return React.createElement(Text, { style: { fontSize: size, color } }, name);
};
