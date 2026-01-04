import { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';

export const metadata: Metadata = {
    title: 'Maintenance',
};

const Maintenence = () => {
    return (
        <section className="relative isolate min-h-screen overflow-hidden bg-[#0c111c] text-white">
            <img
                src="/assets/images/map-dark.svg"
                alt=""
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0c111c]/70 via-[#0c111c]/90 to-[#0c111c]" />

            <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-4 py-10 sm:px-8 lg:px-12 lg:py-14">
                <div className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-white/5 px-6 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur sm:px-8 sm:py-7">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                        <span className="rounded-full bg-[#a2652f] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                            Maintenance mode
                        </span>
                        <span className="text-xs sm:text-sm text-white/60">Planned back by Sat 03 Jan, 21:00</span>
                    </div>
                    <h1 className="mt-4 text-2xl font-bold sm:text-3xl">We&apos;ll be back soon</h1>
                    <p className="mt-2 text-sm sm:text-base text-white/80">We&apos;re performing planned maintenance.</p>
                    <p className="mt-1 text-xs text-white/60">Scheduled by User 2</p>
                </div>

                <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-4xl font-extrabold leading-tight sm:text-5xl">
                                Under <br className="hidden sm:block" />
                                Maintenance
                            </h2>
                            <span className="rounded-full bg-[#7b3f17] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/90">
                                Maintenance
                            </span>
                        </div>

                        <div>
                            <p className="text-lg font-semibold text-[#d6a15c]">ADMS</p>
                            <p className="mt-2 max-w-xl text-base leading-relaxed text-white/80">
                                We&apos;re performing planned maintenance. Expected back by Sat 03 Jan, 21:00.
                            </p>
                            <div className="mt-6 h-px w-24 bg-white/10" />
                        </div>

                        <div className="space-y-3">
                            <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
                                Info
                            </span>
                            <div className="relative space-y-7 border-l border-white/10 pl-9">
                                <span className="pointer-events-none absolute left-0 top-10 h-12 w-px bg-white/10" aria-hidden="true" />

                                <div className="relative">
                                    <span className="absolute left-[-38px] top-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#a2652f] text-lg font-bold shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                                        1
                                    </span>
                                    <p className="text-sm font-semibold text-white/80">03/01/2026</p>
                                    <p className="mt-1 text-sm text-white">Under maintenance</p>
                                    <p className="text-xs text-white/60">We&apos;re performing planned maintenance.</p>
                                </div>

                                <div className="relative pt-2">
                                    <span className="absolute left-[-38px] top-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#28364c] text-lg font-bold text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                                        2
                                    </span>
                                    <p className="text-sm font-semibold text-white/80">Back by</p>
                                    <p className="mt-1 text-sm text-white">Sat 03 Jan, 21:00</p>
                                    <p className="text-xs text-white/60">Scheduled by User 2</p>
                                </div>
                            </div>
                        </div>

                        <Link
                            href="/"
                            className="inline-flex w-max items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
                        >
                            Return home
                        </Link>
                    </div>

                    <div className="flex items-start justify-center lg:justify-end">
                        <div className="hidden rounded-3xl border border-white/5 bg-white/5 p-8 text-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur lg:block">
                            <p className="max-w-xs text-sm leading-relaxed">
                                Systems are temporarily offline while we complete planned maintenance. All services will resume
                                automatically once the work is finished.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Maintenence;
