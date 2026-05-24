package com.xiushuiguan.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("game_record")
public class GameRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private Integer level;

    private Integer stars;

    private Integer timeUsed;

    private Boolean isWin;

    private String failReason;

    private Integer score;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
