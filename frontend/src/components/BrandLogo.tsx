import React from "react";

interface BrandLogoProps {
    size?: "sm" | "md" | "lg" | "xl";
    showTagline?: boolean;
    className?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ size = "md", showTagline = false, className = "" }) => {
    const sizeClasses = {
        sm: "text-lg",
        md: "text-2xl",
        lg: "text-4xl",
        xl: "text-6xl",
    };

    return (
        <div className={`flex flex-col items-start leading-none ${className}`}>
            <div className={`font-extrabold tracking-tight ${sizeClasses[size]} flex items-center`}>
                <span className="text-[#005EB8]">i</span>
                <span className="text-[#87C232]">Q</span>
                <span className="text-[#005EB8]">math</span>
            </div>
            {showTagline && (
                <span className={`text-[#87C232] font-semibold tracking-wider ${size === 'xl' ? 'text-xl mt-1' : 'text-[0.6rem] mt-0.5'}`}>
                    Technologies
                </span>
            )}
        </div>
    );
};

export default BrandLogo;
