const Footer = () => {
    return (
            <div className="p-2 pt-0 mt-auto text-center text-accent-foreground/60 dark:text-white-dark sm:ltr:text-left sm:rtl:text-right">© {new Date().getFullYear()}. {process.env.NEXT_PUBLIC_APP_NAME} All rights reserved.</div>
    );
};

export default Footer;
