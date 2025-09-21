"use client"
import { Button } from "@/components/ui/button"
import { Preloaded, useMutation, usePreloadedQuery } from "convex/react"
import { ArrowLeft, Camera, Edit2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
// import { fetchMutation } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"
import { generateUploadUrl } from "../../../../convex/chats"
import { PhoneNumber } from "@clerk/nextjs/server"


interface ProfileFormData {
    name: string;
    phoneNumber?: string;
}

export default function ProfileComponent({ preloadedUserInfo }: {
    preloadedUserInfo: Preloaded<typeof api.users.readUser>
}) {

    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const userInfo = usePreloadedQuery(preloadedUserInfo)
    const updateUserMutation = useMutation(api.users.updateProfile)
    const updateProfileImage = useMutation(api.users.updateProfileImage)
    const generateUploadUrl = useMutation(api.chats.generateUploadUrl)
    const getUploadUrl = useMutation(api.chats.getUploadUrl)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        defaultValues: {
            name: userInfo?.name || "",
            phoneNumber: userInfo?.phoneNumber || ""
        }
    })

    const onSubmit = async (data: ProfileFormData) => {
        try {
            if (userInfo?.clerkId) {
                await updateUserMutation({
                    clerkId: userInfo.clerkId,
                    name: data.name,
                    phoneNumber: data.phoneNumber
                })

                setIsEditing(false)

                router.refresh()
            } else {
                console.error("User Id is undefined")
            }
        } catch (error) {
            console.error(error)
        }
    }

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e?.target?.files?.[0]

        if (!file) return

        try {
            const reader = new FileReader()
            reader.onloadend = () => {
                //
            }
            reader.readAsDataURL(file)

            const postUrl = await generateUploadUrl()

            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file
            })

            if (!result.ok) {
                throw new Error(`Upload failed: ${result.statusText}`)
            }

            const { storageId } = await result.json()

            const url = await getUploadUrl({ storageId })

            if (url && userInfo?.clerkId) {
                await updateProfileImage({
                    clerkId: userInfo?.clerkId,
                    image: url
                })
            }

        } catch (error) {
            console.error("Upload failed:", error);

        }
    }

    console.log('userInfo', userInfo)
    return (
        <>
            <header className="bg-[#202C33] p-4 flex items-center">
                <Link href="/chat">
                    <Button variant="ghost" size="icon" className="mr-4">
                        <ArrowLeft className="h-6 w-6 text-[#00A884]" />
                    </Button>
                </Link>
                <h1 className="text-xl font-normal">Profile</h1>
            </header>

            <form className="flex-1 overflow-y-auto">
                <div className="p-4 flex flex-col items-center">
                    <div className="relative mb-6">
                        <Avatar className="h-40 w-40">
                            <AvatarImage src={userInfo?.image} alt={userInfo?.name || ""} />
                            <AvatarFallback>{userInfo?.name}</AvatarFallback>
                        </Avatar>
                        <label htmlFor="profile-image" className="absolute bottom-0 right-0 bg-[#00A884] rounded-full p-2 cursor-pointer">
                            <Camera className="w-6 h-6 text-[#111B21]" />
                            <input
                                id="profile-image"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageChange}
                            />
                        </label>
                    </div>

                    <div className="w-full max-w-md space-y-4">
                        {/* name */}
                        <div className="bg-[#202C33] p-4 rounded-lg">
                            <Label htmlFor="name" className="text-[#8696A0] text-sm">Name</Label>
                            {isEditing ? (
                                <div onSubmit={handleSubmit(onSubmit)} className="flex items-center gap-2 mt-1">
                                    <Input
                                        {...register("name", {
                                            required: true
                                        })}
                                        className="bg-transparent border-none text-[#E9EDEF] focus-visible:ring-0"
                                        autoFocus
                                        onBlur={() => {
                                            handleSubmit(onSubmit)
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-[#E9EDEF]">{userInfo?.name}</span>
                                </div>
                            )}
                            {errors.name && (
                                <span className="text-red-500 text-sm mt-1">Name is required</span>
                            )}
                        </div>
                        {/* email */}
                        <div className="bg-[#202C33] p-4 rounded-lg">
                            <Label className="text-[#8696A0] text-sm">Email</Label>
                            <div className="text-[#E9EDEF] mt-1">{userInfo?.email}</div>
                        </div>

                        {/* number */}
                        <div className="bg-[#202C33] p-4 rounded-lg">
                            <Label htmlFor="phoneNumber" className="text-[#8696A0] text-sm">Phone Number</Label>
                            {isEditing ? (
                                <div onSubmit={handleSubmit(onSubmit)} className="flex items-center gap-2 mt-1">
                                    <Input
                                        {...register("phoneNumber")}
                                        className="bg-transparent border-none text-[#E9EDEF] focus-visible:ring-0 w-full"

                                        autoFocus
                                        onBlur={() => {
                                            handleSubmit(onSubmit)
                                        }}
                                    />

                                </div>
                            ) : (
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-[#E9EDEF]"
                                    >{userInfo?.phoneNumber || "not provided"} </span>
                                </div>
                            )}
                            {errors.name && (
                                <span className="text-red-500 text-sm mt-1">error on the Phone Number </span>
                            )}

                        </div>

                        {isEditing ? (
                            <div className="4" />
                        ) : (
                            <Button type="submit" variant={"outline"} size="sm" className="w-full bg-[#00A884] hover:bg-[#00957B]" onClick={() => setIsEditing(true)}>
                                Edit
                            </Button>

                        )}


                        <Button type="submit" size="sm" className="w-full bg-[#00A884] hover:bg-[#00957B]" onClick={handleSubmit(onSubmit)}>
                            Save
                        </Button>
                    </div>


                </div>
            </form>
        </>
    )
}