
/***
 * JSX file for the default home page.
 * This is the default home page that is displayed when the user is not logged in or logged in as a customer /guest/curier.
 */

import NavBar from "../../components/navBar/NavBar";
import classes from "../../assets/styles/defaultHome.module.css";

export default function DefaultHome() {
  return (
    <div className={classes.container}>
      <NavBar 
        isLoggedIn={false}
        onLogout={() => {}}
      />
      <main className={classes.content}>
        {/* Add your default home content here */}
      </main>
    </div>
  );
}
