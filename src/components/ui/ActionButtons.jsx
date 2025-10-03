import React from "react";
import { IconButton, Tooltip, Typography } from "@mui/material";
import { IoEye, CiEdit, MdDelete } from "../../shared/icons/index";

export default function ActionButtons({
  showView = true,
  showEdit = true,
  showDelete = true,
  onView = () => {},
  onEdit = () => {},
  onDelete = () => {},
  viewLabel = "View",
  editLabel = "Edit",
  deleteLabel = "Delete",
  adjust = {
    popper: {
      modifiers: [
        {
          name: "offset",
          options: {
            offset: [0, -4], // move UP closer to the button
          },
        },
      ],
    },
  },
}) {
  return (
    <div style={{ display: "flex", gap: "8px" }}>
      {showView && (
        <Tooltip title={viewLabel} slotProps={adjust}>
          <IconButton
            sx={{
              "&:hover": {
                backgroundColor: "transparent",
              },
            }}
            size="small"
            onClick={onView}
          >
            <div className="size-10 text-yellow50 rounded-sm border border-yellow50 flex justify-center items-center">
              <IoEye size={"28px"} />
            </div>
          </IconButton>
        </Tooltip>
      )}

      {showEdit && (
        <Tooltip title={editLabel} slotProps={adjust}>
          <IconButton
            sx={{
              "&:hover": {
                backgroundColor: "transparent",
              },
            }}
            size="small"
            onClick={onEdit}
          >
            <div className="size-10 text-grey20 rounded-sm !border-[0.5px] border-grey30 flex justify-center items-center">
              <CiEdit size="28px" />
            </div>
          </IconButton>
        </Tooltip>
      )}

      {showDelete && (
        <Tooltip title={deleteLabel} slotProps={adjust}>
          <IconButton
            sx={{
              "&:hover": {
                backgroundColor: "transparent",
              },
            }}
            color="error"
            size="small"
            onClick={onDelete}
          >
            <div className="size-10 text-orange60 rounded-sm border border-orange60 flex justify-center items-center">
              <MdDelete size="24px" />
            </div>
          </IconButton>
        </Tooltip>
      )}
    </div>
  );
}
