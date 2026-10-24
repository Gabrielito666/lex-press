import Lex from "@lek-js/lex";
import homero from "../home/homero.webp";
const About = () =>
{
	return <main>
		<h1>Mi super about</h1>
		<img src={homero}/>
		<p>
			<a href="/static-props" style="display:inline-block;padding:8px 14px;background:#111;color:#fff;border-radius:6px;text-decoration:none">
				probar staticProps →
			</a>
		</p>
	</main>
}

export default About;
