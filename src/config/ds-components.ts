/**
 * Design system component map and schema.
 * Update this to match your actual design system's exported components.
 */

export const DS_COMPONENT_MAP: Record<string, string[]> = {
  button:   ["Button", "IconButton"],
  input:    ["TextInput", "Checkbox", "Radio", "Switch"],
  select:   ["Select", "Combobox", "MultiSelect"],
  a:        ["Link"],
  img:      ["Image", "Avatar"],
  table:    ["DataTable"],
  textarea: ["Textarea"],
};

export const DS_LAYOUT_COMPONENTS = new Set([
  "Stack",
  "HStack",
  "VStack",
  "Grid",
  "GridItem",
  "Cluster",
  "Sidebar",
  "Center",
  "Cover",
  "Frame",
  "Reel",
  "Switcher",
]);

export const DS_COMPONENT_SCHEMAS: Record<string, Record<string, string[]>> = {
  Button: {
    variant: ["primary", "secondary", "tertiary", "ghost", "danger"],
    size:    ["sm", "md", "lg"],
  },
  IconButton: {
    variant: ["primary", "secondary", "ghost", "danger"],
    size:    ["sm", "md", "lg"],
  },
  TextInput: {
    size:   ["sm", "md", "lg"],
    status: ["default", "error", "success", "warning"],
  },
  Checkbox: {
    size: ["sm", "md"],
  },
  Radio: {
    size: ["sm", "md"],
  },
  Select: {
    size:   ["sm", "md", "lg"],
    status: ["default", "error"],
  },
  Combobox: {
    size: ["sm", "md", "lg"],
  },
  Link: {
    variant: ["default", "subtle", "underline"],
    size:    ["sm", "md", "lg"],
  },
  Avatar: {
    size:    ["xs", "sm", "md", "lg", "xl"],
    variant: ["circle", "square"],
  },
  Badge: {
    variant: ["neutral", "primary", "success", "warning", "error"],
    size:    ["sm", "md"],
  },
  Tag: {
    variant: ["neutral", "primary", "success", "warning", "error"],
  },
  Stack: {
    gap:    ["1", "2", "3", "4", "5", "6", "8", "10", "12"],
    align:  ["start", "center", "end", "stretch"],
  },
  Grid: {
    columns: ["1", "2", "3", "4", "6", "12"],
    gap:     ["1", "2", "3", "4", "5", "6", "8"],
  },
};

export const BANNED_DS_PROPS = new Set(["style", "sx", "css"]);

export const CLASSNAME_ALLOWED_COMPONENTS = DS_LAYOUT_COMPONENTS;
