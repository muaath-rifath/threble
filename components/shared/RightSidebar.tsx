function RightSidebar(){
    return(
        <section className="custom-scrollbar rightsidebar">
            <div className="flex flex-1 flex-col justify-start">
                <h3 className="text-heading4-medium text-black dark:text-white mb-4">
                    Suggested Communities
                </h3>
                <div className="glass-card p-4 rounded-2xl">
                    <p className="text-sm text-black/60 dark:text-white/60">Coming soon...</p>
                </div>
            </div>
            <div className="flex flex-1 flex-col justify-start">
                <h3 className="text-heading4-medium text-black dark:text-white mb-4">
                    Suggested Users
                </h3>
                <div className="glass-card p-4 rounded-2xl">
                    <p className="text-sm text-black/60 dark:text-white/60">Coming soon...</p>
                </div>
            </div>
        </section>
        )
}
export default RightSidebar