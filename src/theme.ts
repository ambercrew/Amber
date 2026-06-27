import { createTheme, MantineColorsTuple } from "@mantine/core";

const myColor: MantineColorsTuple = [
	"#faf2f0",
	"#ede2df",
	"#dec2ba",
	"#d0a092",
	"#c4836f",
	"#be7159",
	"#bb674d",
	"#a5563e",
	"#934c36",
	"#7c3d2a",
];

const theme = createTheme({
	colors: {
		myColor,
	},
	primaryColor: "myColor",
});

export default theme;
