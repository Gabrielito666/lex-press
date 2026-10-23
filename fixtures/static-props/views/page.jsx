import Lex from "@lek-js/lex";
import { getStaticProps } from "lex-press/static-props";
const StaticPropsPage = () =>
{
	return <main>
		<h1>{getStaticProps().title}</h1>
	</main>
}

export default StaticPropsPage;
