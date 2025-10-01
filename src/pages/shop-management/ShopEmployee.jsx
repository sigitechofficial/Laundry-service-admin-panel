import {
  MdMailOutline,
  MdOutlinePhone,
  MdOutlineLocationOn,
  CiEdit,
  IoEye,
  IconDriver,
  IconShop,
} from "../../shared/icons/index";

export default function ShopEmployee() {
  return (
    <div className="w-full !mt-8">
      <div className="w-full grid grid-cols-2 gap-5">
        <div className="flex w-full rounded-xl !p-4">
          <div className="w-[720px] bg-[#F5F5F5] ] rounded-[20px] !p-7 flex justify-between font-Inter">
            <div className="!space-y-2">
              <p className="text-grey20 font-medium text-2xl">Employee ID #345345</p>

              <div className="size-20 rounded-2xl">
                <img
                  className="w-full h-full object-center"
                  src="/images/admin.png"
                  alt="customer image"
                />
              </div>

              <p className="font-medium text-2xl !pt-4 capitalize">John Doe</p>
              <p className="font-medium text-base text-grey20 flex items-center gap-2">
                <MdMailOutline size={"22px"} />
                @gmail.com
              </p>
              <p className="font-medium text-base text-grey20 flex items-center gap-2">
                <MdOutlinePhone size={"22px"} />
                876e5r6789
              </p>
              <p className="font-medium text-base text-grey20 flex items-center gap-2">
                <IconDriver />
                Laundry Shop Driver
              </p>

              <p className="font-medium text-base text-grey20 flex items-center gap-2">
                <IconShop />
                Laundry Dryer
              </p>
            </div>

            <div className="flex gap-x-4">
              <CiEdit size={30} />
              <IoEye size={30} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
